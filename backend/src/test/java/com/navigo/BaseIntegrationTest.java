package com.navigo;

import com.navigo.repository.InviteRepository;
import com.navigo.repository.ProjectRepository;
import com.navigo.repository.TaskRepository;
import com.navigo.repository.UserRepository;
import com.navigo.security.JwtService;
import com.navigo.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base class for all integration tests.
 * Provides MockMvc, clears all collections before each test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestRsaKeyConfig.class)
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    // Mock EmailService in all integration tests to avoid SMTP calls
    // and to share a single application context across all test classes
    @MockBean
    protected EmailService emailService;

    @Autowired
    protected JwtService jwtService;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected ProjectRepository projectRepository;

    @Autowired
    protected TaskRepository taskRepository;

    @Autowired
    protected InviteRepository inviteRepository;

    @BeforeEach
    void clearDatabase() {
        userRepository.deleteAll();
        projectRepository.deleteAll();
        taskRepository.deleteAll();
        inviteRepository.deleteAll();
    }
}
