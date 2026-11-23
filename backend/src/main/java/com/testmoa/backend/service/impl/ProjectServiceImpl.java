package com.testmoa.backend.service.impl;

import org.springframework.web.multipart.MultipartFile;
import com.testmoa.backend.global.file.FileStorage;
import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RepositoryConnectRequest;
import com.testmoa.backend.global.client.GitHubIssueClient;
import com.testmoa.backend.service.GitHubRepositoryNames;
import com.testmoa.backend.service.ProjectRepositoryLinkProvider.RepositoryLink;
import com.testmoa.backend.dto.response.ProjectDashboardResponse;
import com.testmoa.backend.dto.response.ProjectResponse;
import com.testmoa.backend.dto.response.RecruitmentSummaryResponse;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.ProjectRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.RecruitmentTypeRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.entity.enums.RecruitmentPhase;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.TypeCode;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ProjectService;
import com.testmoa.backend.service.RecruitmentNames;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectServiceImpl implements ProjectService {

    private final FileStorage fileStorage;
    private final ProjectRepository projectRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentTypeRepository recruitmentTypeRepository;
    private final RegisterRepository registerRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final GitHubIssueClient gitHubIssueClient;
    private final TransactionTemplate transactionTemplate;

    // 업로드 횟수 제한과 안 쓰는 파일 삭제는 #225에서 다룬다.
    @Override
    public String uploadImage(List<MultipartFile> files) {
        if (files.size() != 1) throw SaveInputs.invalid("file", "이미지는 한 번에 한 장씩 올려 주세요");
        MultipartFile file = files.getFirst();
        var kind = FileStorage.detectImage(file)
                .orElseThrow(() -> SaveInputs.invalid("file", "PNG, JPG, WEBP 이미지만 올릴 수 있어요"));
        var stored = fileStorage.save("images", file, kind);
        return FileStorage.IMAGE_URL_PREFIX
                + stored.path().substring("images/".length());
    }

    /**
     * 프로젝트 등록
     */
    @Override
    @Transactional
    public ProjectResponse create(Long userId, ProjectSaveRequest request) {
        SaveInputs.checkImageUrl("imageUrl", request.imageUrl());
        Project project = projectRepository.save(Project.builder()
                .user(userRepository.getReferenceById(userId))
                .title(request.name().trim())
                .description(SaveInputs.blankToNull(request.description()))
                .imageUrl(SaveInputs.blankToNull(request.imageUrl()))
                .build());
        return ProjectResponse.of(project, 0, 0);
    }

    /**
     * 내 프로젝트 전체와 각자의 모집 수
     */
    @Override
    public List<ProjectResponse> findMine(Long userId) {
        return withCounts(projectRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId));
    }

    /**
     * 내 프로젝트 전체 현황. 모집 건을 상태별로 센다
     */
    @Override
    public ProjectDashboardResponse findDashboard(Long userId) {
        List<Long> projectIds = projectRepository.findByUserIdOrderByCreatedAtDescIdDesc(userId).stream().map(Project::getId).toList();
        LocalDateTime now = LocalDateTime.now();
        List<Recruitment> recruitments = projectIds.isEmpty() ? List.of()
                : recruitmentRepository.findByProjectIdInOrderByCreatedAtDescIdDesc(projectIds);
        Map<RecruitmentPhase, Long> counts = recruitments.stream()
                .collect(Collectors.groupingBy(item -> item.phaseAt(now), Collectors.counting()));
        return new ProjectDashboardResponse(new ProjectDashboardResponse.Overview(
                counts.getOrDefault(RecruitmentPhase.RECRUITING, 0L),
                counts.getOrDefault(RecruitmentPhase.TESTING, 0L),
                counts.getOrDefault(RecruitmentPhase.CLOSED, 0L)));
    }

    /**
     * 내 프로젝트 하나
     */
    @Override
    public ProjectResponse findMine(Long userId, Long projectId) {
        return withCounts(List.of(findOwned(userId, projectId))).getFirst();
    }

    /**
     * 내 프로젝트의 모집 건 전체. 최신순
     */
    @Override
    public List<RecruitmentSummaryResponse> findRecruitments(Long userId, Long projectId) {
        findOwned(userId, projectId);
        List<Recruitment> recruitments = recruitmentRepository.findByProjectIdInOrderByCreatedAtDescIdDesc(List.of(projectId));
        List<Long> recruitmentIds = recruitments.stream().map(Recruitment::getId).toList();

        Map<Long, TypeCode> types = recruitmentTypeRepository.findByRecruitmentIdIn(recruitmentIds).stream()
                .collect(Collectors.toMap(item -> item.getRecruitment().getId(), item -> item.getType().getCode(), (first, second) -> first));
        Map<Long, Long> confirmed = countMap(registerRepository.countByRecruitmentIds(recruitmentIds, RegisterStatus.CONFIRMED));
        Map<Long, Long> feedbacks = countMap(feedbackRepository.countByRecruitmentIds(recruitmentIds));

        LocalDateTime now = LocalDateTime.now();
        return recruitments.stream().map(item -> RecruitmentSummaryResponse.of(
                item,
                RecruitmentNames.phase(item.phaseAt(now)),
                RecruitmentNames.selectionMode(item.getSelectionMode()),
                RecruitmentNames.softwareType(types.get(item.getId())),
                confirmed.getOrDefault(item.getId(), 0L),
                feedbacks.getOrDefault(item.getId(), 0L))).toList();
    }

    private static Map<Long, Long> countMap(List<RegisterRepository.RecruitmentCount> counts) {
        return counts.stream().collect(Collectors.toMap(RegisterRepository.RecruitmentCount::getRecruitmentId, RegisterRepository.RecruitmentCount::getCount));
    }

    /**
     * 프로젝트 수정. 설명과 이미지를 비워 보내면 지워진다
     */
    @Override
    @Transactional
    public ProjectResponse update(Long userId, Long projectId, ProjectSaveRequest request) {
        Project project = findOwned(userId, projectId);
        if (!Objects.equals(project.getImageUrl(), request.imageUrl())) SaveInputs.checkImageUrl("imageUrl", request.imageUrl());
        project.update(request.name().trim(), SaveInputs.blankToNull(request.description()), SaveInputs.blankToNull(request.imageUrl()));
        return withCounts(List.of(project)).getFirst();
    }

    /**
     * GitHub 레포 연결(#227). 입력한 레포를 토큰으로 GitHub에서 읽어 이슈를 만들 수 있는지 확인한 뒤 저장한다.
     * 확인(최대 15초)은 트랜잭션 밖에서 하고, 확인 뒤 짧은 트랜잭션에서 프로젝트를 다시 읽어 연결 필드만 바꾼다.
     * 확인을 기다리는 사이 다른 요청이 고친 이름·설명·이미지를 이전 값으로 덮어쓰지 않기 위해서다
     */
    @Override
    @Transactional(propagation = Propagation.SUPPORTS)
    public ProjectResponse connectRepository(Long userId, Long projectId, RepositoryConnectRequest request) {
        findOwned(userId, projectId);
        var name = GitHubRepositoryNames.parse(request.repository())
                .orElseThrow(() -> SaveInputs.invalid("repository", "owner/repo 형식이나 GitHub 주소를 적어 주세요"));
        String token = request.token().trim();
        gitHubIssueClient.verify(new RepositoryLink(name.owner(), name.repo(), token));
        return transactionTemplate.execute(status -> {
            Project project = findOwned(userId, projectId);
            project.connectRepository(name.full(), token);
            return withCounts(List.of(project)).getFirst();
        });
    }

    /**
     * GitHub 레포 연결 해제. 레포와 토큰을 함께 지운다. 연결하지 않았어도 성공이다
     */
    @Override
    @Transactional
    public ProjectResponse disconnectRepository(Long userId, Long projectId) {
        Project project = findOwned(userId, projectId);
        project.disconnectRepository();
        return withCounts(List.of(project)).getFirst();
    }

    private Project findOwned(Long userId, Long projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    // 프로젝트마다 모집 수와 모집 중인 수를 센다. 취소한 모집은 세지 않는다
    private List<ProjectResponse> withCounts(List<Project> projects) {
        List<Long> projectIds = projects.stream().map(Project::getId).toList();
        LocalDateTime now = LocalDateTime.now();
        Map<Long, List<Recruitment>> byProject = recruitmentRepository.findByProjectIdInOrderByCreatedAtDescIdDesc(projectIds).stream()
                .filter(item -> item.getStatus() != RecruitmentStatus.CANCELLED)
                .collect(Collectors.groupingBy(item -> item.getProject().getId()));

        return projects.stream().map(project -> {
            List<Recruitment> recruitments = byProject.getOrDefault(project.getId(), List.of());
            long open = recruitments.stream().filter(item -> item.phaseAt(now) == RecruitmentPhase.RECRUITING).count();
            return ProjectResponse.of(project, recruitments.size(), open);
        }).toList();
    }
}
