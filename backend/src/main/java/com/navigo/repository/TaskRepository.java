package com.navigo.repository;

import com.navigo.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends MongoRepository<Task, String> {

    List<Task> findByProjectOrderByStatusAscOrderAsc(String projectId);

    Optional<Task> findByIdAndProject(String id, String projectId);

    long countByProject(String projectId);

    long countByProjectAndStatus(String projectId, String status);

    Optional<Task> findTopByProjectAndStatusOrderByOrderDesc(String projectId, String status);

    void deleteByProject(String projectId);

    List<Task> findByIdInAndProject(List<String> ids, String projectId);
}
