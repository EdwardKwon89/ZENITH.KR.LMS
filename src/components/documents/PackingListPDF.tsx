"use client";

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Font registration for CJK support
Font.register({
  family: 'Noto Sans KR',
  src: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Regular.woff2',
  fontWeight: 'normal',
});

Font.register({
  family: 'Noto Sans KR',
  src: 'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT-Bold.woff2',
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
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'center' },
  col5: { width: '15%', textAlign: 'center' },
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
  summarySection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 25,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
    border: '1pt solid #1a1a1a',
  },
  summaryItem: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});

interface PLProps {
  data: {
    pl_no: string;
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
      quantity: number;
      pkgs: number;
      net_weight: number;
      gross_weight: number;
    }>;
    total_pkgs: number;
    total_net_weight: number;
    total_gross_weight: number;
  };
  labels: {
    issue_date: string;
    shipper: string;
    consignee: string;
    order_ref: string;
    item_desc: string;
    qty: string;
    pkgs: string;
    net_weight: string;
    gross_weight: string;
    total_pkgs: string;
    remarks: string;
    remarks_text: string;
    generated_on: string;
    transport_mode: string;
    express_air: string;
    pl_no: string;
  };
}

const PackingListPDF = ({ data, labels }: PLProps) => (
  <Document title={`PL_${data.pl_no}`} author="ZENITH LMS">
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{labels.pl_no}</Text>
          <Text style={styles.text}>{labels.pl_no}: {data.pl_no}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.label}>{labels.issue_date}</Text>
          <Text style={styles.value}>{data.date}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.shipper}</Text>
          <Text style={styles.value}>{data.shipper.name}</Text>
          <Text style={styles.text}>{data.shipper.address}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.consignee}</Text>
          <Text style={styles.value}>{data.consignee.name}</Text>
          <Text style={styles.text}>{data.consignee.address}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.order_ref}</Text>
          <Text style={styles.value}>{data.order_no}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>{labels.transport_mode}</Text>
          <Text style={styles.value}>{labels.express_air}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>{labels.item_desc}</Text>
          <Text style={styles.col2}>{labels.qty}</Text>
          <Text style={styles.col3}>{labels.pkgs}</Text>
          <Text style={styles.col4}>{labels.net_weight}</Text>
          <Text style={styles.col5}>{labels.gross_weight}</Text>
        </View>

        {data.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{item.pkgs}</Text>
            <Text style={styles.col4}>{item.net_weight.toFixed(2)}</Text>
            <Text style={styles.col5}>{item.gross_weight.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.summarySection}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{labels.total_pkgs}</Text>
          <Text style={styles.summaryValue}>{data.total_pkgs}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{labels.net_weight}</Text>
          <Text style={styles.summaryValue}>{data.total_net_weight.toFixed(2)} kg</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{labels.gross_weight}</Text>
          <Text style={styles.summaryValue}>{data.total_gross_weight.toFixed(2)} kg</Text>
        </View>
      </View>

      <View style={{ marginTop: 40, borderTop: '0.5pt solid #eee', paddingTop: 10 }}>
        <Text style={styles.label}>{labels.remarks}</Text>
        <Text style={styles.text}>{labels.remarks_text}</Text>
      </View>

      <Text style={styles.footer}>
        ZENITH LMS Digital Document Services • {labels.generated_on} {new Date().toLocaleString()}
      </Text>
    </Page>
  </Document>
);

export default PackingListPDF;
