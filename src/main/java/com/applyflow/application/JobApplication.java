package com.applyflow.application;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "job_applications")
public class JobApplication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String company;
    @Column(nullable = false, length = 160)
    private String roleTitle;
    @Column(length = 2048)
    private String jobLink;
    @Column(nullable = false)
    private LocalDate applicationDate;
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;
    @Column(length = 3000)
    private String notes;
    private LocalDate followUpDate;

    protected JobApplication() { }

    public JobApplication(String company, String roleTitle, String jobLink, LocalDate applicationDate,
                          ApplicationStatus status, String notes, LocalDate followUpDate) {
        update(company, roleTitle, jobLink, applicationDate, status, notes, followUpDate);
    }

    public void update(String company, String roleTitle, String jobLink, LocalDate applicationDate,
                       ApplicationStatus status, String notes, LocalDate followUpDate) {
        this.company = company; this.roleTitle = roleTitle; this.jobLink = jobLink;
        this.applicationDate = applicationDate; this.status = status; this.notes = notes;
        this.followUpDate = followUpDate;
    }

    public Long getId() { return id; }
    public String getCompany() { return company; }
    public String getRoleTitle() { return roleTitle; }
    public String getJobLink() { return jobLink; }
    public LocalDate getApplicationDate() { return applicationDate; }
    public ApplicationStatus getStatus() { return status; }
    public String getNotes() { return notes; }
    public LocalDate getFollowUpDate() { return followUpDate; }
}
