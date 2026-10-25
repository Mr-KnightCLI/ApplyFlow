package com.applyflow.application;

import jakarta.validation.constraints.NotNull;

public record StatusRequest(@NotNull(message = "Choose an application status") ApplicationStatus status) { }
