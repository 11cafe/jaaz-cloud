import {
  pgTable,
  pgEnum,
  timestamp,
  text,
  integer,
  bigint,
  index,
  uniqueIndex,
  decimal,
  serial,
} from "drizzle-orm/pg-core";

export enum TransactionType {
  RECHARGE = "RECHARGE",
  CONSUME = "CONSUME",
}

export const UserSchema = pgTable(
  "user",
  {
    id: serial("id").primaryKey().notNull(),
    email: text("email").notNull(),
    username: text("username").notNull().unique(),
    image_url: text("image_url"),
    updated_at: timestamp("updated_at", {
      precision: 3,
      mode: "string",
    }).notNull(),
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
    provider: text("provider").notNull(),
    oauth_sub: text("oauth_sub").notNull(),
  },
  (table) => {
    return {
      username_key: uniqueIndex("user_username_key").on(table.username),
    };
  },
);

// export const ApiKeySchema = pgTable(
//   "apikey",
//   {
//     id: text("id").primaryKey().notNull(), // key
//     scope: text("scope").notNull(), // access scope: [read, write]
//     user_id: integer("user_id").notNull(), // user id
//     updated_at: timestamp("updated_at", {
//       precision: 3,
//       mode: "string",
//     }).notNull(),
//     created_at: timestamp("created_at", { precision: 3, mode: "string" })
//       .defaultNow()
//       .notNull(),
//   },
//   (table) => {
//     return {
//       apikey_userid_idx: index("apikey_userid_idx").on(table.user_id),
//     };
//   },
// );

// export const AccountSchema = pgTable("account", {
//   id: integer("id")
//     .primaryKey()
//     .references(() => UserSchema.id)
//     .notNull(),
//   balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
//   updatedAt: timestamp("updated_at", {
//     precision: 3,
//     mode: "string",
//   })
//     .defaultNow()
//     .notNull(),
// });

// export const TransactionsSchema = pgTable(
//   "transactions",
//   {
//     id: text("id").primaryKey().notNull(),
//     author_id: text("author_id").references(() => UserSchema.id),
//     amount: decimal("amount", { precision: 100, scale: 2 }).notNull(),
//     stripe_session_id: text("stripe_session_id"),
//     transaction_type: text("transaction_type")
//       .$type<TransactionType>()
//       .notNull(),
//     created_at: timestamp("created_at", {
//       precision: 3,
//       mode: "string",
//     })
//       .defaultNow()
//       .notNull(),
//     previous_balance: decimal("previous_balance", {
//       precision: 100,
//       scale: 2,
//     }).notNull(),
//     after_balance: decimal("after_balance", {
//       precision: 100,
//       scale: 2,
//     }).notNull(),
//     description: text("description"),
//   },
//   (table) => {
//     return {
//       authorID_idx: index("transactions_authorid_idx").on(table.author_id),
//       stripeSessionID_idx: index("transactions_stripe_session_id_idx").on(
//         table.stripe_session_id,
//       ),
//       transactionType_idx: index("transactions_transaction_type_idx").on(
//         table.transaction_type,
//       ),
//     };
//   },
// );

export const DeviceAuthRequestSchema = pgTable("device_auth_requests", {
  device_code: text("device_code").primaryKey().notNull(),
  user_id: integer("user_id"),
  access_token: text("access_token"),
  status: text("status").notNull(), // 'pending' | 'authorized' | 'expired'
  expires_at: bigint("expires_at", { mode: "number" }).notNull(), // 存储时间戳（毫秒）
  created_at: bigint("created_at", { mode: "number" }).notNull(), // 存储时间戳（毫秒）
});

export const schemas = {
  user: UserSchema,
  device_auth_requests: DeviceAuthRequestSchema,
  // apikey: ApiKeySchema,
  // account: AccountSchema,
  // transactions: TransactionsSchema,
};
