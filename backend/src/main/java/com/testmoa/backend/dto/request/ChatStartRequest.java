package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ChatStartRequest(@NotNull @Positive Long registerId) {}
