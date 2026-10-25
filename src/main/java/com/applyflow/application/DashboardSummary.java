package com.applyflow.application;

import java.util.List;

public record DashboardSummary(long totalApplications, long interviews, long offers, long followUpsDue,
                               List<ApplicationResponse> upcomingFollowUps) { }
