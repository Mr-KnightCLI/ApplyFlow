package com.applyflow.application;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.LocalDate;

@Configuration
public class DemoData {
    @Bean CommandLineRunner seedApplications(JobApplicationRepository repository) {
        return args -> {
            if (repository.count() > 0) return;
            LocalDate today = LocalDate.now();
            repository.save(new JobApplication("Linear", "Product Designer", "https://linear.app/careers",
                    today.minusDays(2), ApplicationStatus.INTERVIEW, "First conversation with Maya. Prepare the portfolio walkthrough.", today.plusDays(2)));
            repository.save(new JobApplication("Figma", "UX Engineer", "https://figma.com/careers",
                    today.minusDays(5), ApplicationStatus.APPLIED, "Sent the prototype and a short note about design systems.", today.plusDays(1)));
            repository.save(new JobApplication("Notion", "Product Designer", "https://notion.so/careers",
                    today.minusDays(8), ApplicationStatus.APPLIED, "Follow up with the recruiting team if there is no update.", today));
            repository.save(new JobApplication("Webflow", "Senior Designer", "https://webflow.com/careers",
                    today.minusDays(11), ApplicationStatus.OFFER, "Review the written offer and benefits with Sam.", today.plusDays(4)));
            repository.save(new JobApplication("Miro", "Experience Designer", "https://miro.com/careers",
                    today.minusDays(16), ApplicationStatus.REJECTED, "Kind note from the team; keep the case study for the next application.", null));
            repository.save(new JobApplication("Arc", "Visual Designer", "https://thebrowser.company/careers",
                    today.minusDays(1), ApplicationStatus.WISHLIST, "Tailor the case study before applying.", null));
        };
    }
}
