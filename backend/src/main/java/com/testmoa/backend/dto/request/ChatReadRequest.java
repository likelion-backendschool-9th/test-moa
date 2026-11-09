package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ChatReadRequest(@NotNull @Min(1) Long seq) {}
