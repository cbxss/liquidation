// ==UserScript==
// @name         Liquidation
// @namespace    https://shaybox.com/
// @version      0.1
// @description  Some useful Liquidation scripts
// @author       Shayne Hartford (ShayBox) & Sebastian Vasquez(cbass5)
// @match        https://www.liquidation.com/aucimg/*
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @require      https://raw.githubusercontent.com/jordanthomas/jaro-winkler/master/index.js
// ==/UserScript==

"use strict";

async function request(url) {
	return new Promise((resolve, reject) => {
		GM_xmlhttpRequest({
			method: "GET",
			url,
			onload: (response) => {
				if (response.status >= 200 && response.status < 300) {
					resolve(response);
				} else {
					reject(response);
				}
			},
		});
	});
}

async function main() {
	const $headers = $("tr[bgcolor='99CCFF']");
	$($headers[0]).append("<td>Search</td>");
	$($headers[0]).append("<td>Amazon</td>");
	$($headers[0]).append("<td>Ebay</td>");
	$($headers[1]).append("<td></td>");
	$($headers[1]).append("<td></td>");
	$($headers[1]).append("<td></td>");

	const $rows = $("tr[bgcolor='FFFFFF']");
	for (const row of $rows) {
		const $row = $(row);
        const actualPrice = parseInt($row.find("td")[2].textContent.replace(/(\$|\,)/, ""));
		const amazonTitle = $row.find("td")[0].textContent.split(" ").slice(0, 4).join(" ");
		const ebayTitle = amazonTitle.split(" ").slice(0, 10).join(" ");
		const amazonLink = `https://www.amazon.com/s?k=${amazonTitle}&ref=nb_sb_noss`;
		const ebayLink = `https://www.ebay.com/sch/i.html?_nkw=${ebayTitle}&LH_Sold=1`;
		const linksHtml = [
			"<td>",
			`<a href='${amazonLink}' target="_blank">Amazon</a>`,
			`<a href='${ebayLink}' target="_blank">Ebay</a>`,
			"</td>",
		].join("<br>");

		$row.append(linksHtml);

		const amazon = async () => {
			const html = await request(`${amazonLink}`)
				.then((res) => res.responseText)
				.catch(() => {});

			const items = $(html).find(".a-color-base.a-text-normal").toArray().slice(0, 10);

			if (items.length === 0) {
				$row.append(`<td><a>None</a></td>`);
				return;
			}

			let highestItem;
			let highestDist = -1;
			for (const item of items) {
				const dist = distance(item.textContent, amazonTitle);
				if (dist > highestDist) {
					highestItem = item;
					highestDist = dist;
				}
			}
			const entireDiv = $(highestItem).parent().parent().parent().parent().parent().parent().parent();
			if (entireDiv.text().includes("More Buying Choices")) {
				const moreBuy = entireDiv.find(".a-color-base")[3];
				const price = moreBuy.textContent.trim();
				if (highestDist > 0.7) {
					$row.append(`<td><a style="color:#0000FF">${highestItem.textContent} ${highestDist} ${price}</a></td>`);
				} else {
					$row.append(`<td><a style="color:#FF0000">${highestItem.textContent} ${highestDist} ${price}</a></td>`);
				}
			} else {
				$row.append(`<td><a style="color:#0000FF">None found</a></td>`);
			}
		};

		const ebay = async () => {
			const ebayHtml = await request(`${ebayLink}&_sacat=0&_pgn=1&LH_ItemCondition=1500|3000&_from=R40`)
				.then((res) => res.responseText)
				.catch(() => {});

			const items = $(ebayHtml).find(".s-item__price").toArray();

			if (items.length === 0) {
				$row.append(`<td><a>None</a></td>`);
				return;
			}

			const prices = items.map((i) => parseInt(i.textContent.replace(/(\$|\,)/, "")) || 0);
            var b;
            for(b=0;  b<prices.length; b++){
                if(prices[b]>actualPrice*2){
                    prices[b] = actualPrice
                }
            }
			const total = prices.reduce((a, b) => a + b);
			const average = total / prices.length;

			$row.append(`<td><a>$${average.toFixed(2)}</a></td>`);
		};

		(async () => {
			await amazon();
			await ebay();
		})();
	}
}

main();