import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';
import schedule from 'node-schedule';

// Prismaクライアントを初期化
const prisma = new PrismaClient();

// RSSパーサーを初期化
const parser = new Parser();

// ポーリング間隔を1分に設定
const interval = '*/1 * * * *';

// フィードのURLを設定
const feedURL = 'http://blog.livedoor.jp/kinisoku/index.rdf';

// フィードをポーリングして、取得した記事をデータベースに保存する関数
const pollFeed = async () => {
	try {
		const feed = await parser.parseURL(feedURL);

		// 記事を保存するためのオブジェクトの配列を初期化
		const feedItems = [];

		// フィードから取得した記事を、Prismaのモデルにマッピング
		feed.items.forEach((item) => {
			feedItems.push({
				title: item.title,
				link: item.link,
				description: item.content,
				pubDate: new Date(item.isoDate),
			});
		});

		// 記事をデータベースに保存
		await prisma.feedItem.createMany({ data: feedItems });
		console.log(`Saved ${feedItems.length} items from ${feedURL}`);
	} catch (err) {
		console.error(err);
	}
};

// スケジュールを設定
schedule.scheduleJob(interval, pollFeed);
