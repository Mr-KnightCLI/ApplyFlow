package com.applyflow.application;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {
    private final ApplicationService service;
    public ApplicationController(ApplicationService service) { this.service = service; }

    @GetMapping public List<ApplicationResponse> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) ApplicationStatus status) { return service.list(q, status); }
    @GetMapping("/{id}") public ApplicationResponse get(@PathVariable long id) { return service.get(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ApplicationResponse create(@Valid @RequestBody ApplicationRequest request) { return service.create(request); }
    @PutMapping("/{id}") public ApplicationResponse update(@PathVariable long id,
            @Valid @RequestBody ApplicationRequest request) { return service.update(id, request); }
    @PatchMapping("/{id}/status") public ApplicationResponse changeStatus(@PathVariable long id,
            @Valid @RequestBody StatusRequest request) { return service.changeStatus(id, request.status()); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) { service.delete(id); }
}
