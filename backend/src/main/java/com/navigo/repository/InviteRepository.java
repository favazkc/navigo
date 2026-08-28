package com.navigo.repository;

import com.navigo.model.Invite;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface InviteRepository extends MongoRepository<Invite, String> {

    Optional<Invite> findByToken(String token);

    void deleteByProjectAndInvitedEmailAndStatus(String projectId, String invitedEmail, String status);
}
