package com.applyflow.application;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class ApplicationService {
    private final JobApplicationRepository repository;

    public ApplicationService(JobApplicationRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> list(String query, ApplicationStatus status) {
        Specification<JobApplication> spec = Specification.where(null);
        if (query != null && !query.isBlank()) {
            String term = "%" + query.trim().toLowerCase() + "%";
            spec = spec.and((root, criteria, cb) -> cb.or(
                    cb.like(cb.lower(root.get("company")), term),
                    cb.like(cb.lower(root.get("roleTitle")), term)));
        }
        if (status != null) spec = spec.and((root, criteria, cb) -> cb.equal(root.get("status"), status));
        return repository.findAll(spec, Sort.by(Sort.Direction.DESC, "applicationDate", "id"))
                .stream().map(ApplicationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ApplicationResponse get(long id) { return ApplicationResponse.from(find(id)); }

    public ApplicationResponse create(ApplicationRequest request) {
        validateDates(request);
        return ApplicationResponse.from(repository.save(toEntity(request)));
    }

    public ApplicationResponse update(long id, ApplicationRequest request) {
        validateDates(request);
        JobApplication application = find(id);
        application.update(clean(request.company()), clean(request.roleTitle()), clean(request.jobLink()),
                request.applicationDate(), request.status(), clean(request.notes()), request.followUpDate());
        return ApplicationResponse.from(application);
    }

    public ApplicationResponse changeStatus(long id, ApplicationStatus status) {
        JobApplication application = find(id);
        application.update(application.getCompany(), application.getRoleTitle(), application.getJobLink(),
                application.getApplicationDate(), status, application.getNotes(), application.getFollowUpDate());
        return ApplicationResponse.from(application);
    }

    public void delete(long id) { repository.delete(find(id)); }

    @Transactional(readOnly = true)
    public DashboardSummary summary() {
        LocalDate today = LocalDate.now();
        List<ApplicationResponse> next = repository.findAll(Sort.by(Sort.Direction.ASC, "followUpDate"))
                .stream().filter(a -> a.getFollowUpDate() != null && !a.getFollowUpDate().isBefore(today)
                        && !a.getFollowUpDate().isAfter(today.plusDays(7)))
                .map(ApplicationResponse::from).toList();
        long due = repository.count((root, criteria, cb) -> cb.and(
                cb.isNotNull(root.get("followUpDate")),
                cb.lessThanOrEqualTo(root.get("followUpDate"), today)));
        return new DashboardSummary(repository.count(), count(ApplicationStatus.INTERVIEW),
                count(ApplicationStatus.OFFER), due, next);
    }

    private long count(ApplicationStatus status) {
        return repository.count((root, criteria, cb) -> cb.equal(root.get("status"), status));
    }

    private JobApplication find(long id) {
        return repository.findById(id).orElseThrow(() -> new ApplicationNotFoundException(id));
    }

    private JobApplication toEntity(ApplicationRequest request) {
        return new JobApplication(clean(request.company()), clean(request.roleTitle()), clean(request.jobLink()),
                request.applicationDate(), request.status(), clean(request.notes()), request.followUpDate());
    }

    private void validateDates(ApplicationRequest request) {
        if (request.followUpDate() != null && request.applicationDate() != null
                && request.followUpDate().isBefore(request.applicationDate())) {
            throw new InvalidApplicationException("followUpDate", "Follow-up date cannot be before the application date");
        }
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
