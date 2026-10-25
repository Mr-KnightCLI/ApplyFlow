package com.applyflow.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;
import java.time.LocalDate;

public record ApplicationRequest(
        @NotBlank(message = "Company is required") @Size(max = 120, message = "Company must be 120 characters or fewer") String company,
        @NotBlank(message = "Role title is required") @Size(max = 160, message = "Role title must be 160 characters or fewer") String roleTitle,
        @Size(max = 2048, message = "Job link is too long") @URL(message = "Enter a valid job link starting with http:// or https://") String jobLink,
        @NotNull(message = "Application date is required") @PastOrPresent(message = "Application date cannot be in the future") LocalDate applicationDate,
        @NotNull(message = "Choose an application status") ApplicationStatus status,
        @Size(max = 3000, message = "Notes must be 3,000 characters or fewer") String notes,
        LocalDate followUpDate
) { }
