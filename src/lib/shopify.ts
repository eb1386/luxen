import Client from 'shopify-buy';

export const shopifyClient = Client.buildClient({
  domain: 'cen0p1-qf.myshopify.com',
  storefrontAccessToken: '8e8342a59365af96335fc25cccf0af10',
});

export const PRODUCT_ID = 'gid://shopify/Product/8814670971049';
