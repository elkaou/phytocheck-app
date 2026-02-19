# expo-iap API Notes for PhytoCheck

## Installation
```bash
npx expo install expo-iap@next
```

## Config plugin in app.config.ts
```json
plugins: ["expo-iap", ["expo-build-properties", { android: { kotlinVersion: "2.2.0" } }]]
```

## Key API (useIAP hook)
```tsx
const { connected, products, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases, availablePurchases } = useIAP({
  onPurchaseSuccess: async (purchase) => { ... },
  onPurchaseError: (error) => { ... },
});
```

## Fetch products
```tsx
fetchProducts({ skus: ['phytocheck_premium'], type: 'in-app' });
```

## Request purchase (non-consumable)
```tsx
await requestPurchase({
  request: {
    apple: { sku: 'phytocheck_premium' },
    google: { skus: ['phytocheck_premium'] },
  },
});
```

## Finish transaction
```tsx
await finishTransaction({ purchase, isConsumable: false });
```

## Restore purchases
```tsx
await getAvailablePurchases();
// then iterate availablePurchases
```

## Important: requires development build, NOT Expo Go
## Product ID: phytocheck_premium (non-consumable, one-time purchase)
