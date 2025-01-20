import Moralis from "moralis";
import { promises as fs } from "fs";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.MORALIS_API_KEY as string;
const chain = process.env.CHAIN_ID as string;
const tokenAddress = process.env.TOKEN_ADDRESS as string;
const tokenPrice = process.env.TOKEN_PRICE as string;

if (!apiKey || !chain || !tokenAddress || !tokenPrice) {
  console.error(
    "Missing required environment variables. Check your .env file."
  );
  process.exit(1); // Exit the process with an error code
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchAllTokenOwners = async (): Promise<void> => {
  try {
    console.log("Starting Moralis...");
    await Moralis.start({ apiKey, maxRetries: 3 });

    let allResults: any[] = [];
    let cursor: string = "";
    let hasMore: boolean = true;

    console.log("Fetching token owners...");

    while (hasMore) {
      await sleep(1500);

      const response = await Moralis.EvmApi.token
        .getTokenOwners({
          chain,
          tokenAddress,
          cursor,
          order: "DESC",
        })
        .then((res) => res.response);

      if (response.result.length > 0) {
        allResults.push(...response.result);
        console.log(`Fetched ${response.result.length} records...`);
      }
      cursor = response.cursor ?? ""; // Update the cursor or set to null
      hasMore = !!cursor;
    }

    const categorizedResults: { [key: string]: any[] } = {
      "Range 1M+": [],
      "Range 500k-1M": [],
      "Range 100k-499k": [],
      "Range 50k-99k": [],
      "Range 11k-49k": [],
      "Range 1k-10k": [],
      // "Range 0 - 1k": [],
    };

    allResults.forEach((owner) => {
      const value = parseFloat(owner.balanceFormatted);
      const usd_value = value * parseFloat(tokenPrice);
      const address = owner.ownerAddress;

      // const result = { address, usd: usd_value, tokenAmount: value };
      const result = address;

      if (usd_value > 1000000) {
        categorizedResults["Range 1M+"].push(result);
      } else if (usd_value >= 500000 && usd_value <= 1000000) {
        categorizedResults["Range 500k-1M"].push(result);
      } else if (usd_value >= 100000 && usd_value < 500000) {
        categorizedResults["Range 100k-499k"].push(result);
      } else if (usd_value >= 50000 && usd_value < 100000) {
        categorizedResults["Range 50k-99k"].push(result);
      } else if (usd_value >= 11000 && usd_value < 50000) {
        categorizedResults["Range 11k-49k"].push(result);
      } else if (usd_value >= 1000 && usd_value < 10000) {
        categorizedResults["Range 1k-10k"].push(result);
      }
    });

    const filePathByRange = `list/${tokenAddress}_onwers.json`;

    await fs.writeFile(
      filePathByRange,
      JSON.stringify(categorizedResults, null, 2)
    );
    console.log(`Successfully saved ${allResults.length} token owners`);
  } catch (error) {
    console.error("Error fetching token owners:", error);
  }
};

fetchAllTokenOwners();
