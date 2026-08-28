package com.navigo.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.navigo.config.FlexibleInstantDeserializer;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public class CreateProjectRequest {

    @NotBlank(message = "Project name is required")
    private String name;

    private String description;

    @JsonDeserialize(using = FlexibleInstantDeserializer.class)
    private Instant dueDate;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }
}
