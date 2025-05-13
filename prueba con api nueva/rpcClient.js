
const RPC_URL = "http://192.168.255.14:8545"; 

// topic0 = keccak256("indexed_id_product_event(int256,string)")
const TOPIC0_HASH =
  "0xe5c2cc523913383a6000dbdbb392ecfc2ae01abccbf5c88cefd2eb575a3769cc";
const CONTRACT_ADDRESS = "0x062C4B86dcA6Ed53457cf75F4699651B64CD6478";
const FROM_BLOCK = "0x9";

export async function getAllEventsByProductId(productId) {
  const hexId = "0x" + BigInt(productId).toString(16).padStart(64, "0");

  const body = {
    jsonrpc: "2.0",
    method: "eth_getLogs",
    params: [
      {
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
        address: CONTRACT_ADDRESS,
        topics: [TOPIC0_HASH, hexId],
      },
    ],
    id: 1,
  };

  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    const logs = json.result;

    const parsed = logs.map((log) => {
      const decoded = parseDataString(log.data);
      return {
        id: parseInt(log.topics[1]),
        ...decoded,
        txHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber, 16),
      };
    });

    return parsed.filter((e) => e.id !== 0);
  } catch (err) {
    console.error("Error al obtener eventos por ID:", err);
    return [];
  }
}

export async function getDashboardStats() {
  try {
    const blockRes = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });

    const blockHex = (await blockRes.json()).result;
    const blockNumber = parseInt(blockHex, 16);

    const blockDataRes = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: [blockHex, true],
        id: 2,
      }),
    });

    const blockData = (await blockDataRes.json()).result;
    const txCount = blockData.transactions.length;
    const timestamp = parseInt(blockData.timestamp, 16);

    let peers = 0;
    try {
      const peersRes = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "admin_peers",
          params: [],
          id: 3,
        }),
      });
      const peersData = await peersRes.json();
      peers = peersData.result?.length || 0;
    } catch (err) {
      console.warn("admin_peers no disponible");
    }

    const logsRes = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getLogs",
        params: [
          {
            fromBlock: FROM_BLOCK,
            toBlock: "latest",
            address: CONTRACT_ADDRESS,
            topics: [TOPIC0_HASH],
          },
        ],
        id: 4,
      }),
    });

    const logs = (await logsRes.json()).result;
    const uniqueIds = new Set(logs.map((log) => parseInt(log.topics[1])));

    return {
      block: blockNumber,
      txCount,
      timestamp,
      peers,
      productIds: Array.from(uniqueIds).filter((id) => id !== 0).length,
    };
  } catch (err) {
    console.error("Error en getDashboardStats:", err);
    return null;
  }
}


export async function getLatestProductEvents() {
  const body = {
    jsonrpc: "2.0",
    method: "eth_getLogs",
    params: [
      {
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
        address: CONTRACT_ADDRESS,
        topics: [TOPIC0_HASH],
      },
    ],
    id: 1,
  };

  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    const logs = json.result;

    const latestById = {};

    logs.forEach((log) => {
      const id = parseInt(log.topics[1]);
      if (id === 0) return; 

      const rawData = log.data;
      const decodedData = parseDataString(rawData);

      latestById[id] = {
        id,
        ...decodedData,
        txHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber, 16),
      };
    });

    return Object.values(latestById);
  } catch (error) {
    console.error("Error al obtener logs de producto:", error);
    return [];
  }
}

function parseDataString(hexData) {
  try {
    if (hexData.startsWith("0x")) hexData = hexData.slice(2);
    const buffer = new Uint8Array(
      hexData.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    const decoded = new TextDecoder().decode(buffer).replace(/\0/g, "");

    const parts = decoded.split("$");
    if (parts.length < 2) return {};

    const values = parts[1].split(",");
    if (values.length !== 5) return {};

    return {
      latitude: parseFloat(values[0]),
      longitude: parseFloat(values[1]),
      altitude: parseFloat(values[2]),
      speed: parseFloat(values[3]),
      satellites: parseInt(values[4]),
    };
  } catch (err) {
    console.error("Error al decodificar data:", err);
    return {};
  }
}

export async function getTransactionByHash(txHash) {
  const body = {
    jsonrpc: "2.0",
    method: "eth_getTransactionByHash",
    params: [txHash],
    id: 53,
  };

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    return json.result;
  } catch (error) {
    console.error("Error al obtener la transacción:", error);
    return null;
  }
}

export async function getLatestBlockNumber() {
  const body = {
    jsonrpc: "2.0",
    method: "eth_blockNumber",
    params: [],
    id: 1,
  };

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    return parseInt(json.result, 16);
  } catch (error) {
    console.error("Error al obtener el último bloque:", error);
    return 0;
  }
}

export async function getBlockByNumber(number) {
  const hexNumber = "0x" + number.toString(16);

  const body = {
    jsonrpc: "2.0",
    method: "eth_getBlockByNumber",
    params: [hexNumber, false], // false = no incluir txs
    id: 1,
  };

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    return json.result;
  } catch (error) {
    console.error(`Error al obtener bloque ${number}:`, error);
    return null;
  }
}


export async function getBlockByHash(hash) {
  const body = {
    jsonrpc: "2.0",
    method: "eth_getBlockByHash",
    params: [hash, false], // false = no incluir las transacciones
    id: 1,
  };

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    return json.result;
  } catch (error) {
    console.error(`Error al obtener el bloque con hash ${hash}:`, error);
    return null;
  }
}
