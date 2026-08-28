package com.navigo.service;

import com.navigo.model.Task;
import com.navigo.model.User;
import com.navigo.repository.TaskRepository;
import com.navigo.repository.UserRepository;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public TaskService(TaskRepository taskRepository,
                       UserRepository userRepository,
                       MongoTemplate mongoTemplate) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Populate assignee and createdBy fields on a task map.
     * Returns enriched map with { _id, name, email } embedded.
     */
    public Map<String, Object> populateTask(Task task) {
        Map<String, Object> map = taskToMap(task);
        if (task.getAssignee() != null) {
            userRepository.findById(task.getAssignee()).ifPresent(u ->
                    map.put("assignee", userRef(u)));
        }
        if (task.getCreatedBy() != null) {
            userRepository.findById(task.getCreatedBy()).ifPresent(u ->
                    map.put("createdBy", userRef(u)));
        }
        return map;
    }

    /**
     * Populate a list of tasks.
     */
    public List<Map<String, Object>> populateTasks(List<Task> tasks) {
        // Gather all unique user IDs to fetch in batch
        Set<String> userIds = new HashSet<>();
        for (Task t : tasks) {
            if (t.getAssignee() != null) userIds.add(t.getAssignee());
            if (t.getCreatedBy() != null) userIds.add(t.getCreatedBy());
        }
        Map<String, User> userMap = new HashMap<>();
        for (String uid : userIds) {
            userRepository.findById(uid).ifPresent(u -> userMap.put(u.getId(), u));
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Task t : tasks) {
            Map<String, Object> map = taskToMap(t);
            if (t.getAssignee() != null && userMap.containsKey(t.getAssignee())) {
                map.put("assignee", userRef(userMap.get(t.getAssignee())));
            }
            if (t.getCreatedBy() != null && userMap.containsKey(t.getCreatedBy())) {
                map.put("createdBy", userRef(userMap.get(t.getCreatedBy())));
            }
            result.add(map);
        }
        return result;
    }

    /**
     * Bulk update task orders. Equivalent to Task.bulkWrite() in Node.
     */
    public void bulkUpdateOrders(String projectId, List<com.navigo.dto.ReorderRequest.TaskUpdate> updates) {
        BulkOperations ops = mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, Task.class);
        Instant now = Instant.now();
        for (com.navigo.dto.ReorderRequest.TaskUpdate u : updates) {
            Query q = new Query(Criteria.where("_id").is(u.getId()).and("project").is(projectId));
            Update update = new Update().set("order", u.getOrder()).set("updatedAt", now);
            if (u.getStatus() != null) {
                update.set("status", u.getStatus());
            }
            ops.updateOne(q, update);
        }
        ops.execute();
    }

    private Map<String, Object> taskToMap(Task t) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("_id", t.getId());
        map.put("project", t.getProject());
        map.put("title", t.getTitle());
        map.put("description", t.getDescription());
        map.put("status", t.getStatus());
        map.put("priority", t.getPriority());
        map.put("dueDate", t.getDueDate());
        map.put("assignee", t.getAssignee());
        map.put("createdBy", t.getCreatedBy());
        map.put("order", t.getOrder());
        map.put("createdAt", t.getCreatedAt());
        map.put("updatedAt", t.getUpdatedAt());
        return map;
    }

    private Map<String, Object> userRef(User u) {
        return Map.of("_id", u.getId(), "name", u.getName(), "email", u.getEmail());
    }
}
