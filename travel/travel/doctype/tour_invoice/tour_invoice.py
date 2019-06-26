# -*- coding: utf-8 -*-
# Copyright (c) 2019, Bilal Ghayad and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import string, random, re
from frappe.model.document import Document
from frappe import utils, _
from erpnext.accounts.general_ledger import make_gl_entries
from erpnext.accounts.general_ledger import delete_gl_entries
from erpnext.controllers.accounts_controller import AccountsController
from erpnext.accounts.utils import get_outstanding_invoices, get_account_currency, get_balance_on, get_allow_cost_center_in_entry_of_bs_account
from erpnext.accounts.party import get_party_account

#class TourInvoice(Document):
class TourInvoice(AccountsController):
#	pass

	def validate(self):
		self.title = self.customer_name
#
#		i = 0
#		for d in self.items:
#			j = i + 1
#			i = i + 1
#			while j < len(self.items):
#				if d.ticket_no == self.items[j].get('ticket_no'):
#					frappe.throw(_("Ticket No {0} is duplicated with row number {1}"). format(d.ticket_no, j+1));
#				j = j+1
#				
#			parent = frappe.db.get_value("Ticket Invoice Ticket",{"ticket_no": d.ticket_no, "docstatus": ["!=", 2], "parent": ["!=", self.name]}, "parent")
#			if parent:
#				frappe.throw(_("Duplicated Ticket No is not allowed. Ticket No {0} is already existed in Ticket Invoice No {1}"). 
#						format(d.ticket_no, parent))
#			if d.ticket_no:
#				carrier_no = frappe.db.get_value("Carrier Settings",{"carrier_no": d.ticket_no.split('-')[0]}, "carrier_no")
#				if not carrier_no:
#					frappe.throw(_("Carrier No {0} is not existed for any carrier"). format(d.ticket_no.split('-')[0]))
#			elif not d.ticket_no:
#				frappe.throw(_("Ticket No should not be empty. Please check ticket no at row # {0}"). format(i))

		self.set_status()

	def on_cancel(self):
		delete_gl_entries(voucher_type=self.doctype, voucher_no=self.name)
		self.set_status()

	def on_submit(self):
		if (self.cust_grand_total != 0):
			self.make_gl_entries()
		self.set_status()

	def make_gl_entries(self):
#		customer_against = self.supplier + " + " + self.income_account

		gl_entry = []

#		customer_gl_entries =  self.get_gl_dict({
		if self.account_currency == self.company_default_currency:
			gl_entry.append(self.get_gl_dict({
				"account": self.receivable_account,
				"against": self.income_account,
				"party_type": "Customer",
				"party": self.customer,
				"debit": self.base_cust_grand_total,
				"debit_in_account_currency": self.base_cust_grand_total,
				"against_voucher": self.name,
				"against_voucher_type": self.doctype,
				"account_currency": self.account_currency
			}))
		else:
			gl_entry.append(self.get_gl_dict({
				"account": self.receivable_account,
				"against": self.income_account,
				"party_type": "Customer",
				"party": self.customer,
				"debit": self.base_cust_grand_total,
				"debit_in_account_currency": self.cust_grand_total,
				"against_voucher": self.name,
				"against_voucher_type": self.doctype,
				"account_currency": self.account_currency
			}))


		gl_entry.append(self.get_gl_dict({
			"account": self.def_sales_vat_acc,
			"against": self.customer,
			"credit": self.base_customer_vat,
			"credit_in_account_currency": self.base_customer_vat
		}))

		supplier_against = self.customer + " - " + self.income_account
		suppliers_gl_entry = frappe.get_doc("Tour Invoice", self.name).get('items')
		for d in suppliers_gl_entry:

			if d.supplier_account_currency == self.company_default_currency:
				gl_entry.append(self.get_gl_dict({
					"account": d.payable_account,
					"against": self.customer,
					"party_type": "Supplier",
					"party": d.get('supplier'),
					"credit": d.get('base_supp_total_av'),
					"credit_in_account_currency": d.get('base_supp_total_av'),
					"against_voucher": self.name,
					"against_voucher_type": self.doctype,
					"account_currency": d.get('supplier_account_currency')
				}))
			else:
				gl_entry.append(self.get_gl_dict({
					"account": d.payable_account,
					"against": self.customer,
					"party_type": "Supplier",
					"party": d.get('supplier'),
					"credit": d.get('base_supp_total_av'),
					"credit_in_account_currency": d.get('supp_total_av'),
					"against_voucher": self.name,
					"against_voucher_type": self.doctype,
					"account_currency": d.get('supplier_account_currency')
				}))

			gl_entry.append(self.get_gl_dict({
				"account": self.def_purchase_vat_acc,
				"against": d.get('supplier'),
				"debit": d.get('base_supp_vat'),
				"debit_in_account_currency": d.get('base_supp_vat')
			}))

#		income_against = self.customer + " - " + self.supplier 

#		income_gl_entry = self.get_gl_dict({
		gl_entry.append(self.get_gl_dict({
			"account": self.income_account,
			"against": self.customer,
			"credit": self.base_c_s,
			"credit_in_account_currency": self.base_c_s,
			"cost_center": self.cost_center
		}))

		if float(self.paid_amount) > 0:
#			payment_gl_entry = []
			payments = frappe.get_doc("Tour Invoice", self.name).get('payments')
			for d in payments:
				if d.account_currency == self.company_default_currency:
					if d.account_currency == self.account_currency:
						gl_entry.append(self.get_gl_dict({
							"account": self.receivable_account,
							"against": d.get('account'),
							"party_type": "Customer",
							"party": self.customer,
							"credit": d.get('amount'),
							"credit_in_account_currency": d.get('amount'),
							"against_voucher": self.name,
							"against_voucher_type": self.doctype,
							"account_currency": self.account_currency
						}))
					else:
						gl_entry.append(self.get_gl_dict({
							"account": self.receivable_account,
							"against": d.get('account'),
							"party_type": "Customer",
							"party": self.customer,
							"credit": d.get('base_amount'),
							"credit_in_account_currency": d.get('base_amount') * self.customer_exchange_rate,
							"against_voucher": self.name,
							"against_voucher_type": self.doctype,
							"account_currency": self.account_currency
						}))

					gl_entry.append(self.get_gl_dict({
						"account": d.get('account'),
						"against": self.customer,
						"debit": d.get('amount'),
						"debit_in_account_currency": d.get('amount'),
						"account_currency": d.get('account_currency')
					}))
				else:
					if self.account_currency != self.company_default_currency:
						if self.account_currency == d.account_currency:
							gl_entry.append(self.get_gl_dict({
								"account": self.receivable_account,
								"against": d.get('account'),
								"party_type": "Customer",
								"party": self.customer,
								"credit": d.get('base_amount'),
								"credit_in_account_currency": d.get('amount'),
								"against_voucher": self.name,
								"against_voucher_type": self.doctype,
								"account_currency": self.account_currency
							}))
						else:
							gl_entry.append(self.get_gl_dict({
								"account": self.receivable_account,
								"against": d.get('account'),
								"party_type": "Customer",
								"party": self.customer,
								"credit": d.get('base_amount'),
								"credit_in_account_currency": d.get('base_amount') * d.get('account_exchange_rate'),
								"against_voucher": self.name,
								"against_voucher_type": self.doctype,
								"account_currency": self.account_currency
							}))
					else:
						gl_entry.append(self.get_gl_dict({
							"account": self.receivable_account,
							"against": d.get('account'),
							"party_type": "Customer",
							"party": self.customer,
							"credit": d.get('base_amount'),
							"credit_in_account_currency": d.get('base_amount'),
							"against_voucher": self.name,
							"against_voucher_type": self.doctype,
							"account_currency": self.account_currency
						}))

					gl_entry.append(self.get_gl_dict({
						"account": d.get('account'),
						"against": self.customer,
						"debit": d.get('base_amount'),
						"debit_in_account_currency": d.get('amount'),
						"account_currency": d.get('account_currency')
					}))

		make_gl_entries(gl_entry, cancel=(self.docstatus == 2), update_outstanding="No", merge_entries=False)

@frappe.whitelist()
def get_party_details(party_type, party, company):

	party_account =  get_party_account(party_type, party, company)
#	frappe.msgprint("Customer Account is {0}" .format(customer_account))
	if party_account:
		party_currency = get_account_currency(party_account)
	else:
		party_currency = None
	return party_account, party_currency

@frappe.whitelist()
def get_default_values(company, date):

	company_accounts = frappe.db.sql("""select default_receivable_account, default_payable_account, default_income_account, cost_center
						from `tabCompany` where company_name = %s""", (company), as_dict=True)
	selling_taxes = frappe.get_doc("Sales Taxes and Charges Template", {'company': company, 'is_default': 1}).get('taxes')
	selling_vat_account = selling_taxes[0].get('account_head')
	buying_taxes = frappe.get_doc("Purchase Taxes and Charges Template", {'company': company, 'is_default': 1}).get('taxes')
	buying_vat_account = buying_taxes[0].get('account_head')
	vat_to_be_paid_account = frappe.db.get_value("Account", {'account_number': '44251', 'company': company}, "name")
	company_default_currency = frappe.db.get_value("Company", company, 'default_currency')
	country_currency = frappe.db.get_single_value('Global Defaults', 'country_currency')

	rate = frappe.db.sql("""select exchange_rate from `tabCurrency Exchange`
		where from_currency = %s and to_currency = 'LBP' and date <= %s order by date desc limit 1
		""", (company_default_currency, date), as_dict=True)

#	frappe.msgprint("Default Currency in Global Defaults is {0}" .format(country_currency))

#	frappe.msgprint("The exchange_rate is {0}" .format((rate[0]['exchange_rate'])))

#	frappe.msgprint("The rate conversion for VAT currency is {0} and the posting date is {1}" .format(rate, date))

#	frappe.msgprint("The selling taxes are {0}, the selling vat accountn is {1}, the buying taxes are {2} and the buying vat account is {3} and account for vat to be paid is {4}" .format(selling_taxes, selling_vat_account, buying_taxes, buying_vat_account, vat_to_be_paid_account))
#	frappe.msgprint("The company accounts are: {0}". format(company_accounts))
#	return receivable_acc, payable_acc
	return company_accounts, selling_vat_account, buying_vat_account, vat_to_be_paid_account, company_default_currency, rate[0]['exchange_rate'] if len(rate) > 0 else None, country_currency

@frappe.whitelist()
def get_employee_id(user_id):

#	frappe.msgprint("Session ID {0}". format(user_id))
	employee_id = frappe.db.get_value("Employee", {'user_id': user_id}, "name")
	employee_name = frappe.db.get_value("Employee", {'user_id': user_id}, "employee_name")

#	frappe.msgprint("Employee ID is {0} and Name is {1}". format(employee_id, employee_name))
#	return receivable_acc, payable_acc
	return employee_id, employee_name

@frappe.whitelist()
def get_currency_rate(company_default_currency, customer_currency, date):

	rate = frappe.db.sql("""select exchange_rate from `tabCurrency Exchange`
		where from_currency = %s and to_currency = %s and date <= %s order by date desc limit 1
		""", (company_default_currency, customer_currency, date), as_dict=True)

	if len(rate) == 0:
		return None
	else:
		return rate[0]['exchange_rate']
