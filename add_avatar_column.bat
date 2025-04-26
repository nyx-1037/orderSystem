@echo off
echo ALTER TABLE `user` ADD COLUMN `avatar_data` LONGBLOB COMMENT 'user avatar binary data' AFTER `address`; > temp_sql.sql
mysql -u root -p676100nbc order_system < temp_sql.sql
del temp_sql.sql
echo Avatar column added successfully!
pause