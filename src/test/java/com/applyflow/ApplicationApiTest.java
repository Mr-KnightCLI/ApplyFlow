package com.applyflow;

import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:applyflow-test;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
class ApplicationApiTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach void clearDatabase() { jdbc.update("DELETE FROM job_applications"); }

    private String validApplication() {
        return """
                {"company":"Northstar","roleTitle":"Product Designer","jobLink":"https://example.com/jobs/1",
                "applicationDate":"2026-10-20","status":"APPLIED","notes":"Meet the design team",
                "followUpDate":"2026-10-27"}
                """;
    }

    @Test void createsAndReadsAnApplication() throws Exception {
        mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content(validApplication()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.company").value("Northstar"));
        mvc.perform(get("/api/applications").param("q", "north"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].roleTitle").value("Product Designer"));
    }

    @Test void supportsStatusChangesAndRemoval() throws Exception {
        String response = mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content(validApplication()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = com.fasterxml.jackson.databind.json.JsonMapper.builder().build().readTree(response).get("id").asLong();

        mvc.perform(patch("/api/applications/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INTERVIEW\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("INTERVIEW"));
        mvc.perform(delete("/api/applications/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/applications/" + id)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not found"));
    }

    @Test void reportsFieldErrorsForInvalidInput() throws Exception {
        String invalid = "{\"company\":\" \",\"roleTitle\":\"Designer\",\"applicationDate\":\"2026-10-20\",\"status\":\"APPLIED\",\"followUpDate\":\"2026-10-19\"}";
        mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.company").exists());
    }

    @Test void rejectsFutureApplicationDatesAndFollowUpsBeforeApplicationDate() throws Exception {
        String future = validApplication().replace("2026-10-20", LocalDate.now().plusDays(1).toString());
        mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content(future))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.applicationDate").exists());

        String earlierFollowUp = validApplication().replace("2026-10-27", "2026-10-19");
        mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content(earlierFollowUp))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.followUpDate").exists());
    }

    @Test void summarizesRealStoredApplications() throws Exception {
        mvc.perform(post("/api/applications").contentType(MediaType.APPLICATION_JSON).content(validApplication()));
        mvc.perform(get("/api/dashboard")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(1))
                .andExpect(jsonPath("$.interviews").value(0)).andExpect(jsonPath("$.offers").value(0));
    }
}
