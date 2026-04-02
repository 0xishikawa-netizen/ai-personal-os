package com.kairos;

import org.postgresql.util.PSQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.io.EOFException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;

/**
 * 接続失敗時に待機して再試行する DataSource ラッパー。
 * 「Max client connections reached」などで一時的に接続できない場合に有効。
 */
public class RetryingDataSource implements DataSource {

	private static final Logger log = LoggerFactory.getLogger(RetryingDataSource.class);

	private static final int MAX_ATTEMPTS = 12;   // 最大試行回数
	private static final long RETRY_DELAY_MS = 10_000L; // 1回あたり 10 秒待機

	private final DataSource delegate;

	public RetryingDataSource(DataSource delegate) {
		this.delegate = delegate;
	}

	@Override
	public Connection getConnection() throws SQLException {
		return getConnectionWithRetry(() -> delegate.getConnection());
	}

	@Override
	public Connection getConnection(String username, String password) throws SQLException {
		return getConnectionWithRetry(() -> delegate.getConnection(username, password));
	}

	private Connection getConnectionWithRetry(ConnectionSupplier supplier) throws SQLException {
		SQLException lastException = null;
		for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				return supplier.get();
			} catch (SQLException e) {
				lastException = e;
				if (isRetryable(e) && attempt < MAX_ATTEMPTS) {
					log.warn("DB接続失敗 (試行 {}/{}): {} - {} 秒後に再試行します",
							attempt, MAX_ATTEMPTS, e.getMessage(), RETRY_DELAY_MS / 1000);
					try {
						Thread.sleep(RETRY_DELAY_MS);
					} catch (InterruptedException ie) {
						Thread.currentThread().interrupt();
						throw new SQLException("接続再試行中に割り込み", ie);
					}
				} else {
					throw e;
				}
			}
		}
		throw lastException != null ? lastException : new SQLException("接続に失敗しました");
	}

	private static boolean isRetryable(SQLException e) {
		String msg = e.getMessage();
		if (msg != null) {
			if (msg.contains("Max client connections reached") || msg.contains("The connection attempt failed")) {
				return true;
			}
		}
		if (e instanceof PSQLException p) {
			String sqlState = p.getSQLState();
			if (sqlState != null && ("08000".equals(sqlState) || "08001".equals(sqlState) || "08006".equals(sqlState) || "XX000".equals(sqlState))) {
				return true;
			}
		}
		// EOFException（サーバーが接続を閉じた）も一時的なので再試行
		Throwable t = e;
		while (t != null) {
			if (t instanceof EOFException) {
				return true;
			}
			t = t.getCause();
		}
		return false;
	}

	@Override
	public PrintWriter getLogWriter() throws SQLException {
		return delegate.getLogWriter();
	}

	@Override
	public void setLogWriter(PrintWriter out) throws SQLException {
		delegate.setLogWriter(out);
	}

	@Override
	public void setLoginTimeout(int seconds) throws SQLException {
		delegate.setLoginTimeout(seconds);
	}

	@Override
	public int getLoginTimeout() throws SQLException {
		return delegate.getLoginTimeout();
	}

	@Override
	public java.util.logging.Logger getParentLogger() throws SQLFeatureNotSupportedException {
		return delegate.getParentLogger();
	}

	@Override
	public <T> T unwrap(Class<T> iface) throws SQLException {
		if (iface.isInstance(delegate)) {
			return iface.cast(delegate);
		}
		return delegate.unwrap(iface);
	}

	@Override
	public boolean isWrapperFor(Class<?> iface) throws SQLException {
		return iface.isInstance(delegate) || delegate.isWrapperFor(iface);
	}

	@FunctionalInterface
	private interface ConnectionSupplier {
		Connection get() throws SQLException;
	}
}
