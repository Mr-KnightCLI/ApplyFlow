package com.applyflow.application;

import java.time.LocalDate;

public record ApplicationResponse(Long id, String company, String roleTitle, String jobLink,
                                  LocalDate applicationDate, ApplicationStatus status, String notes,
                                  LocalDate followUpDate) {
    public static ApplicationResponse from(JobApplication application) {
        return new ApplicationResponse(application.getId(), application.getCompany(), application.getRoleTitle(),
                application.getJobLink(), application.getApplicationDate(), application.getStatus(),
                application.getNotes(), application.getFollowUpDate());
    }
}
