import { scheduleJob } from 'node-schedule';
import Parser from 'rss-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const parser = new Parser();

// フィードを保存する関数
async function saveFeed(feed: Parser.Output<{}>): Promise<void> {
	const { title, link, items, description, feedUrl, image, paginationLinks } = feed;

	for (const item of items) {
		const { title, link } = item;

		// 既に同じURLを持つレコードが存在するかどうかチェックする
		const existingRecord = await prisma.feedItem.findUnique({
			where: {
				url: link,
			},
		});

		// レコードが存在しない場合のみ、新しいレコードを挿入する
		if (!existingRecord) {
			await prisma.feedItem.create({
				data: {
					title: title || "",
					url: link || "",
					link: feed.link || "",
					pubDate: item.pubDate || "",
				},
			});
		}
	}

	console.log(`Saved ${feed.items.length} items from ${title}`);
}

// 定期的にフィードを解析するジョブをスケジュールする関数
function scheduleFeedCrawler(url: string, interval: number): void {
	scheduleJob(`*/${interval} * * * *`, async function () {
		try {
			const feed = await parser.parseURL(url);
			await saveFeed(feed);
		} catch (error) {
			console.error(`Failed to parse feed from ${url}: ${error}`);
		}
	});
}

// メインの処理
async function main(): Promise<void> {
	await prisma.$connect();

	// フィードを定期的に解析するジョブをスケジュールする
	scheduleFeedCrawler('https://www.elog-ch.net/feed', 5); // 5分ごとにフィードを解析する

	// プロセスが終了するまで待機する
	process.stdin.resume();
}

main().catch((error) => console.error(error));
