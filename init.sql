CREATE DATABASE wwg;

CREATE TABLE login_credentials (
	phone_num VARCHAR(20),
	seesion_id CHAR(16),
	expire_date DATETIME
);

CREATE TABLE user_credentials (
	phone_num VARCHAR(20) NOT NULL,
	name VARCHAR(10) NOT NULL,
	curriculum INT(1) DEFAULT 0,
	password_hash CHAR(64),
	salt CHAR(16),
	PRIMARY KEY (phone_num)
);