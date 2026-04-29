"use client";

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Font registration for CJK support
Font.register({
  family: 'Noto Sans KR',
  src: 'https://fonts.gstatic.com/s/notosanskr/v27/PpkLp3gh9_iS_mH2_vN0_lD7p66_pYw.woff2', // Regular
  fontWeight: 'normal',
});

Font.register({
  family: 'Noto Sans KR',
  src: 'https://fonts.gstatic.com/s/notosanskr/v27/PpkLp3gh9_iS_mH2_vN0_lD7p66_pYw.woff2', // Using same for bold for now if bold URL not available, or find bold
  fontWeight: 'bold',
});

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Noto Sans KR',
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2pt solid #1a1a1a',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Noto Sans KR',
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#000',
  },
  section: {
    marginBottom: 20,
    flexDirection: 'row',
    gap: 15,
  },
  box: {
    flex: 1,
    border: '1pt solid #e5e7eb',
    padding: 12,
    minHeight: 100,
    borderRadius: 4,
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#374151',
  },
  table: {
    marginTop: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    borderBottom: '1.5pt solid #1a1a1a',
    borderTop: '1pt solid #e5e7eb',
    fontWeight: 'bold',
  },
  col1: { width: '40%', paddingLeft: 8 },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'right', paddingRight: 8 },
  col4: { width: '25%', textAlign: 'right', paddingRight: 8 },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  totalSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    width: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
    border: '1pt solid #1a1a1a',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

interface CIProps {
  data: {
    invoice_no: string;
    date: string;
    shipper: {
      name: string;
      address: string;
    };
    consignee: {
      name: string;
      address: string;
    };
    order_no: string;
    items: Array<{
      description: string;
      hs_code?: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }>;
    total_amount: number;
    currency: string;
  };
}

const CommercialInvoicePDF = ({ data }: CIProps) => (
  <Document title={`CI_${data.invoice_no}`} author="ZENITH LMS">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Commercial Invoice</Text>
          <Text style={styles.text}>Invoice No: {data.invoice_no}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.label}>Issue Date</Text>
          <Text style={styles.value}>{data.date}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>Shipper / Exporter</Text>
          <Text style={styles.value}>{data.shipper.name}</Text>
          <Text style={styles.text}>{data.shipper.address}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>Consignee / Recipient</Text>
          <Text style={styles.value}>{data.consignee.name}</Text>
          <Text style={styles.text}>{data.consignee.address}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>Order Reference</Text>
          <Text style={styles.value}>{data.order_no}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>Trade Terms</Text>
          <Text style={styles.value}>DDU (Delivery Duty Unpaid)</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>Description of Goods</Text>
          <Text style={styles.col2}>Quantity</Text>
          <Text style={styles.col3}>Unit Price</Text>
          <Text style={styles.col4}>Sub-Total</Text>
        </View>

        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>
              {item.description} {item.hs_code ? `\n(HS: ${item.hs_code})` : ''}
            </Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.col4}>{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL ({data.currency})</Text>
          <Text style={styles.totalValue}>{data.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>

      <View style={{ marginTop: 40, borderTop: '0.5pt solid #eee', paddingTop: 10 }}>
        <Text style={styles.label}>Declaration</Text>
        <Text style={[styles.text, { fontStyle: 'italic' }]}>
          We hereby certify that the information in this invoice is true and correct, and that the contents and value of this shipment are as stated above.
        </Text>
      </View>

      <Text style={styles.footer}>
        ZENITH LMS Digital Document Services • Generated on {new Date().toLocaleString()}
      </Text>
    </Page>
  </Document>
);

export default CommercialInvoicePDF;
