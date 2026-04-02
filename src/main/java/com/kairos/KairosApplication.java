package com.kairos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * quiz 配下の {@code @Entity} / Repository を確実に拾うため、スキャン範囲を明示。
 */
@SpringBootApplication
@EntityScan(basePackages = "com.kairos")
@EnableJpaRepositories(basePackages = "com.kairos")
public class KairosApplication {

	public static void main(String[] args) {
		SpringApplication.run(KairosApplication.class, args);
	}

}
