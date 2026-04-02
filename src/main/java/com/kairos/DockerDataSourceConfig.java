package com.kairos;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * docker プロファイル時のみ、データソースを {@link RetryingDataSource} で包む。
 * プールサイズは {@code application-docker.yml} の {@code spring.datasource.hikari} に任せる。
 */
@Configuration
@Profile("docker")
public class DockerDataSourceConfig {

	@Bean
	static BeanPostProcessor hikariRetryingDataSourcePostProcessor() {
		return new BeanPostProcessor() {
			@Override
			public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
				if (bean instanceof HikariDataSource hikari) {
					return new RetryingDataSource(hikari);
				}
				return bean;
			}
		};
	}
}
