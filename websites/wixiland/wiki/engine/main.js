const fs = require("fs");
const path = require("path");

const config = require("./config.js");

const markdownPath = config.markdownWikiPath;
const indexPath = path.join(config.htmlWikiPath, "index.json");

const template = fs.readFileSync("./template.html", "utf8");

/**
 * @param {String} text 
 * @param {String} separator 
 * @returns String
 */
const extractPart = (text, separator) => text.slice(text.indexOf(separator) + separator.length, text.lastIndexOf(separator)).trim();

const compileMarkdown = (markdown) => {
	let html = markdown;
	const replacements = [
		[/^(#{1,3})\s(.+)$/gm, (_, hashes, content) => `<h${hashes.length}>${content}</h${hashes.length}>`], // Titles
		[/(\*\*\*|___)(.+?)\1/g, "<b><i>$2</i></b>"], // Bold and italic
		[/(\*\*|__)(.+?)\1/g, "<b>$2</b>"], // Bold
		[/(\*|_)(.+?)\1/g, "<i>$2</i>"], // Italic
		[/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2">$1</a>`], // Links
		[/^(?:---|\*\*\*|___)\s*$/gm, "<hr />"],
		[/((?:^[\*\-\+]\s+.+\n?)+)/gm, (match) => `<ul>${match.trim().split("\n").map((line) => line.replace(/^[\*\-\+]\s+/, "<li>") + "</li>").join("")}</ul>`], // Lists
	];
	for (const replacement of replacements) html = html.replace(replacement[0], replacement[1]);
	return html;
};

const compileInfobox = (infobox) => {

};

const cleanWiki = async () => {
	const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { pages: [], count: 0 };

	for (const page of index.pages) fs.rmSync(path.join(config.htmlWikiPath, page.file), { recursive: true });

	console.log(`Deleted ${index.count} pages.`);
};

const buildIndex = async () => {
	const index = {
		pages: [],
		count: 0
	};

	for (const file of fs.readdirSync(markdownPath, { recursive: true })) {
		const filePath = path.join(markdownPath, file);
		const fileName = file.slice(0, -3);
		const markdown = fs.readFileSync(filePath, "utf8");

		const metadata = JSON.parse(extractPart(markdown, config.separators.metadata));

		if (metadata.active) {
			index.pages.push({
				title: metadata.title,
				summary: metadata.summary,
				file: fileName
			});

			index.count++;
		} else console.log(`Wiki page "${fileName}" disabled.`);
	}

	fs.writeFileSync(indexPath, JSON.stringify(index));

	console.log(`Indexed ${index.count} pages.`);
};

const buildWiki = async () => {
	const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { pages: [], count: 0 };

	for (const page of index.pages) {
		const filePath = path.join(markdownPath, `${page.file}.md`);
		const markdown = fs.readFileSync(filePath, "utf8");
		const infobox = JSON.parse(extractPart(markdown, config.separators.infobox));
		const content = extractPart(markdown, config.separators.content);

		const htmlFolder = path.join(config.htmlWikiPath, page.file);
		fs.mkdirSync(htmlFolder, { recursive: true });

		const html = compileMarkdown(template.split("{{TITLE}}").join(page.title).split("{{SUMMARY}}").join(page.summary).split("{{FILENAME}}").join(page.file).split("{{CONTENT}}").join(compileInfobox(infobox) + content));
		fs.writeFileSync(path.join(htmlFolder, "index.html"), html, "utf8");

		console.log(`Built file ${page.file}.`);
	}
};

(async () => {
	console.log("Cleaning wiki...");
	await cleanWiki();
	console.log("Wiki cleaned.");

	if (process.env.CLEAN != "true") {
		console.log("Building index...");
		await buildIndex();
		console.log("Index built.");

		console.log("Building wiki...");
		await buildWiki();
		console.log("Wiki built.");
	}
})();