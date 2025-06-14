# Stripe 充值功能设置指南

## 概述

本应用已集成 Stripe 支付功能，支持两种充值方式：
1. **嵌入式支付** - 用户在应用内直接完成支付（推荐）
2. **重定向支付** - 跳转到 Stripe 托管的支付页面

**注意：** 此版本使用前端轮询检查支付状态，开发和生产环境都使用真实的 Stripe 测试/生产密钥。

## 环境变量配置

在你的 `.env.local` 文件中添加以下 Stripe 配置：

```bash
# Stripe 配置
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 获取 Stripe 密钥

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 在左侧菜单中选择 "Developers" > "API keys"
3. 复制 "Publishable key" 和 "Secret key"
4. 将 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 设置为 Publishable key
5. 将 `STRIPE_SECRET_KEY` 设置为 Secret key

## 功能特性

### 测试模式（开发环境）
- 使用 Stripe 测试密钥，不会产生真实费用
- 可以使用 Stripe 提供的测试卡号进行测试
- 支付流程与生产环境完全一致

### 生产模式
- 使用 Stripe 生产密钥，处理真实支付
- 用户可以选择嵌入式支付或重定向支付
- 通过前端轮询检查支付状态（无需 webhook）

## 文件结构

```
src/
├── components/
│   └── StripeCheckout.tsx          # 嵌入式支付组件
├── pages/
│   ├── billing.tsx                 # 充值页面
│   └── api/billing/
│       ├── createCheckoutSession.ts    # 创建 Checkout Session (重定向支付)
│       ├── createPaymentIntent.ts      # 创建 Payment Intent (嵌入式支付)
│       ├── checkPaymentStatus.ts       # 检查支付状态
│       ├── getBalance.ts               # 获取用户余额
│       ├── listTransactions.ts         # 获取交易记录
│       └── consume.ts                  # 消费余额
```

## 使用方法

### 1. 用户充值流程

1. 用户访问 `/billing` 页面
2. 选择充值金额（预设金额或自定义）
3. 选择支付方式（嵌入式或重定向）
4. 完成支付
5. 系统自动更新用户余额

### 2. 余额消费

使用 `handleConsume` 工具函数来消费用户余额：

```typescript
import { handleConsume } from "@/utils/handleConsume";
import { TransactionType } from "@/schema";

// 消费示例
const result = await handleConsume(
  1.0,                              // 消费金额
  TransactionType.CONSUME_TEXT,     // 交易类型
  "AI text generation"              // 描述（可选）
);

if (result.success) {
  // 消费成功
} else {
  // 处理错误
  console.error(result.error);
}
```

## 安全注意事项

1. **环境变量安全**：
   - 确保 `STRIPE_SECRET_KEY` 不会暴露在客户端
   - 只有 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 可以在客户端使用

2. **支付状态验证**：
   - 系统会从 Stripe 服务器验证支付状态
   - 防止重复处理相同的支付事件

3. **数据库事务**：
   - 所有余额更新操作都在数据库事务中进行
   - 确保数据一致性

## 测试

### 测试卡号

在测试模式下，可以使用以下测试卡号：

- **成功支付**: `4242424242424242`
- **需要验证**: `4000002500003155`
- **被拒绝**: `4000000000000002`

所有测试卡的过期日期可以设置为任何未来日期，CVC 可以是任何 3 位数字。

## 故障排除

### 常见问题

1. **支付失败**：
   - 检查 Stripe 密钥是否正确配置
   - 确认 webhook URL 可以从外网访问
   - 查看 Stripe Dashboard 中的日志

2. **余额未更新**：
   - 检查支付状态轮询是否正常工作
   - 查看浏览器控制台和服务器日志中的错误信息
   - 确认数据库连接正常

3. **配置问题**：
   - 确认环境变量正确设置
   - 开发环境使用测试密钥（sk_test_...）
   - 生产环境使用生产密钥（sk_live_...）

## 支持的支付方式

嵌入式支付支持以下支付方式：
- 信用卡/借记卡
- Apple Pay（在支持的设备上）
- Google Pay（在支持的浏览器中）
- 其他本地支付方式（根据地区而定）

## 更多资源

- [Stripe 文档](https://stripe.com/docs)
- [React Stripe.js 文档](https://docs.stripe.com/sdks/stripejs-react)
- [Stripe Payment Intents API](https://stripe.com/docs/api/payment_intents)
