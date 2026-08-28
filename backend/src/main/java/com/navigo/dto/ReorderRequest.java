package com.navigo.dto;

import java.util.List;

public class ReorderRequest {

    private List<TaskUpdate> updates;

    public List<TaskUpdate> getUpdates() { return updates; }
    public void setUpdates(List<TaskUpdate> updates) { this.updates = updates; }

    public static class TaskUpdate {
        private String id;
        private int order;
        private String status; // nullable — only for dragged task

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public int getOrder() { return order; }
        public void setOrder(int order) { this.order = order; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
