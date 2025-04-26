package com.ordersystem.util;

import java.util.UUID;

public class UUIDGenerater {
	public static void main(String[] args) {


		for (int i = 0; i < 10; i++) {
			// 生成随机UUID
			UUID uuid = UUID.randomUUID();
			// 转换为字符串并打印输出
			System.out.println(uuid.toString());
		}

	}
}