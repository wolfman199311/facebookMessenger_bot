import sys
import json
import pandas as pd  # for dataframes
import matplotlib.pyplot as plt # for plotting graphs
import seaborn as sns # for plotting graphs
import datetime as dt
import numpy as np


def main():
    lines = sys.argv[1];
    data = pd.read_excel(lines)
    # data = pd.read_csv(lines)
    data.head()
    filtered_data = data[['Country', 'CustomerID']].drop_duplicates()

    filtered_data.Country.value_counts()[:10].plot(kind='bar')
    uk_data = data[data.Country == 'United Kingdom']

    uk_data.describe()

    uk_data = uk_data[(uk_data['Quantity'] > 0)]

    uk_data = uk_data[['CustomerID', 'InvoiceDate',
                       'InvoiceNo', 'Quantity', 'UnitPrice']]

    # Calulate total purchase

    uk_data['TotalPurchase'] = uk_data['Quantity'] * uk_data['UnitPrice']

    uk_data_group = uk_data.groupby('CustomerID').agg({'InvoiceDate': lambda date: (date.max() - date.min()).days,
                                                       'InvoiceNo': lambda num: len(num),
                                                       'Quantity': lambda quant: quant.sum(),
                                                       'TotalPurchase': lambda price: price.sum()})
    uk_data_group.head()

    # Change the name of columns
    uk_data_group.columns = ['num_days',
                             'num_transactions', 'num_units', 'spent_money']
    uk_data_group.head()

    # Average Order Value
    uk_data_group['avg_order_value'] = uk_data_group['spent_money'] / \
        uk_data_group['num_transactions']
    uk_data_group.head()

    purchase_frequency = sum(
        uk_data_group['num_transactions'])/uk_data_group.shape[0]

    # Calculate repeat rate and churn rate
    # Repeat Rate
    repeat_rate = uk_data_group[uk_data_group.num_transactions >
                                1].shape[0]/uk_data_group.shape[0]
    # Churn Rate
    churn_rate = 1-repeat_rate

    purchase_frequency, repeat_rate, churn_rate
    uk_data_group['profit_margin'] = uk_data_group['spent_money']*0.05
    uk_data_group.head()

    # Calculate Customer Liftime Value
    # Customer Value
    uk_data_group['CLV'] = (uk_data_group['avg_order_value']
                            * purchase_frequency)/churn_rate
    # Customer Lifetime Value
    uk_data_group['cust_lifetime_value'] = uk_data_group['CLV'] * \
        uk_data_group['profit_margin']
    print(uk_data_group['cust_lifetime_value'])
    uk_data_group.head()

# Start process
if __name__ == '__main__':
    main()
