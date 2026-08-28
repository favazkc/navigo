package com.navigo.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.navigo.config.FlexibleInstantDeserializer;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class UpdateTaskRequest {

    private String title;
    private String description;
    private String status;
    private String priority;

    @JsonDeserialize(using = FlexibleInstantDeserializer.class)
    private Instant dueDate;
    private String assignee;
    private Integer order;

    // Track which fields were explicitly provided in the request body
    private final Map<String, Boolean> presentFields = new HashMap<>();

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; presentFields.put("title", true); }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; presentFields.put("description", true); }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; presentFields.put("status", true); }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; presentFields.put("priority", true); }

    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; presentFields.put("dueDate", true); }

    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; presentFields.put("assignee", true); }

    public Integer getOrder() { return order; }
    public void setOrder(Integer order) { this.order = order; presentFields.put("order", true); }

    public boolean has(String field) { return presentFields.containsKey(field); }
}
