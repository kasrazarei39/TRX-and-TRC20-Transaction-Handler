# Transaction Processing Application

This is a Node.js application for processing blockchain transactions. It includes modules for handling TRX and TRC20 token transfers.

## Getting Started

Before running the application, ensure you have the required dependencies installed.

### Prerequisites

- Node.js
- npm (Node Package Manager)

### Installation

1. Clone this repository to your local machine:

   ```
   bashCopy code
   git clone https://github.com/kasrazarei39/TRX-and-TRC20-Transaction-Handler.git
   ```

2. Install the project dependencies:

   ```
   bashCopy code
   cd transaction-processing-app
   npm install
   ```

3. Configure the application by editing the `config/config.properties` file. You will need to provide values for properties such as `fullNode`, `solidityNode`, and `eventServer` to connect to your Tron network.

4. Start the application:

   ```
   bashCopy code
   node index.js
   ```

The application will start processing transactions and updating the database.

## Usage

### API Endpoints

The application provides the following API endpoints for interacting with the system:

- `/get-cold-wallet-address`: Get the cold wallet address.
- `/get-trx-balance/:address`: Get the TRX balance of a given address.
- `/get-token-balance/:tokenContractAddress/:address`: Get the token balance of a given address for a specific token.
- `/withdraw-tokens/:tokenContractAddress`: Withdraw tokens to a user wallet.
- `/withdraw-trx`: Withdraw TRX to a user wallet.
- `/get-transaction-status/:transactionId`: Get the status of a transaction by its ID.
- `/create-wallet`: Create a new wallet.
- `/add-token/:tokenAddress`: Add a token to the system.
- `/delete-token/:tokenAddress`: Delete a token from the system.
- `/update-number-of-block-to-verify/:value`: Update the number of blocks to verify.
- `/current-block`: Get the current block number.
- `/tx-info/:txId`: Get information about a transaction by its ID.
- `/get-token-information/:tokenAddress`: Get information about a specific token.
- `/change-cold-wallet-address/:coldWalletAddress`: Change the cold wallet address.
- `/withdraw-to-cold-wallet`: Withdraw tokens to the cold wallet.
- `/withdraw-token-to-cold-wallet/:tokenAddress`: Withdraw a specific token to the cold wallet.
- `/get-admin-wallet-address`: Get the admin wallet address.

### Modules

The application is structured into the following modules:

- `index.js`: The main entry point of the application that processes transactions.
- `trxTransaction.js`: Handles TRX transactions and withdrawal.
- `trc20Transaction.js`: Handles TRC20 token transactions and withdrawal.
- `database.js`: Manages the database and provides functions for adding and updating transaction data.
- `admin.js`: Manages admin-related functionality, such as cold wallet address and settings.
- `vault.js`: Provides functions for saving and retrieving private keys securely.