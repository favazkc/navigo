package com.navigo.repository;

import com.navigo.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {

    @Query("{ 'members.user': ?0 }")
    List<Project> findByMembersUser(String userId);
}
