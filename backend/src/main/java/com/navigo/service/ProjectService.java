package com.navigo.service;

import com.navigo.repository.TaskRepository;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

    private final TaskRepository taskRepository;

    public ProjectService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Derive project status from task counts.
     * Mirrors deriveProjectStatus() in project.routes.js
     */
    public String deriveProjectStatus(long total, long done) {
        if (total == 0) return "To Do";
        if (done == total) return "Done";
        return "In Progress";
    }

    /**
     * Count total and done tasks for a given project.
     */
    public long countTasks(String projectId) {
        return taskRepository.countByProject(projectId);
    }

    public long countDoneTasks(String projectId) {
        return taskRepository.countByProjectAndStatus(projectId, "Done");
    }
}
