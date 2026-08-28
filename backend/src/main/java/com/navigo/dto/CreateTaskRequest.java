package com.navigo.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.navigo.config.FlexibleInstantDeserializer;

import java.time.Instant;

public class CreateTaskRequest {

    private String title;
    private String description;
    private String status;
    private String priority;

    @JsonDeserialize(using = FlexibleInstantDeserializer.class)
    private Instant dueDate;
    private String assignee;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }

    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }
}
