package com.applyflow.application;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final ApplicationService service;
    public DashboardController(ApplicationService service) { this.service = service; }
    @GetMapping public DashboardSummary summary() { return service.summary(); }
}
