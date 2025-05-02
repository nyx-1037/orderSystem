package com.ordersystem.util;

import java.util.UUID;

/**
 * UUID生成工具类
 * 提供生成和验证UUID的方法
 */
public class UUIDGenerater {
	
	/**
	 * 生成随机UUID字符串
	 * @return 不含连字符的UUID字符串
	 */
	public static String generateUUID() {
		// 生成随机UUID并移除连字符
		return UUID.randomUUID().toString().replace("-", "");
	}
	
	/**
	 * 生成带连字符的完整UUID字符串
	 * @return 原始UUID字符串（含连字符）
	 */
	public static String generateFullUUID() {
		return UUID.randomUUID().toString();
	}
	
	/**
	 * 验证字符串是否为有效的UUID格式
	 * @param uuidStr 待验证的UUID字符串
	 * @return 是否为有效UUID
	 */
	public static boolean isValidUUID(String uuidStr) {
		if (uuidStr == null) {
			return false;
		}
		
		try {
			// 尝试解析UUID，如果成功则为有效UUID
			UUID.fromString(uuidStr);
			return true;
		} catch (IllegalArgumentException e) {
			return false;
		}
	}

	public static void main(String[] args) {
		for (int i = 0; i < 10; i++) {
			System.out.println(generateUUID());
		}
	}
}