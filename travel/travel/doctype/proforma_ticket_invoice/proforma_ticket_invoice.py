# -*- coding: utf-8 -*-
# Copyright (c) 2019, Bilal Ghayad and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import utils, _
import string, random, re
from frappe.model.document import Document
from erpnext.accounts.general_ledger import make_gl_entries
from erpnext.accounts.general_ledger import delete_gl_entries
from erpnext.controllers.accounts_controller import AccountsController
from erpnext.accounts.utils import get_outstanding_invoices, get_account_currency, get_balance_on, get_allow_cost_center_in_entry_of_bs_account
from erpnext.accounts.party import get_party_account
from erpnext.setup.doctype.company.company import update_company_current_month_sales, update_company_current_month_purchase

#class TicketInvoice(Document):
class ProformaTicketInvoice(AccountsController):
#	pass

	def validate(self):
		self.title = self.customer_name
		i = 0
		for d in self.items:
			j = i + 1
			i = i + 1
			while j < len(self.items):
				if d.ticket_no == self.items[j].get('ticket_no'):
					frappe.throw(_("Ticket No {0} is duplicated with row number {1}"). format(d.ticket_no, j+1));
				j = j+1
				
			parent = frappe.db.get_value("Ticket Invoice Ticket",{"ticket_no": d.ticket_no, "docstatus": ["!=", 2], "parent": ["!=", self.name]}, "parent")
			if parent:
				frappe.throw(_("Duplicated Ticket No is not allowed. Ticket No {0} is already existed in Ticket Invoice No {1}"). 
						format(d.ticket_no, parent))
			if d.ticket_no:
				carrier_no = frappe.db.get_value("Carrier Settings",{"carrier_no": d.ticket_no.split('-')[0]}, "carrier_no")
				if not carrier_no:
					frappe.throw(_("Carrier No {0} is not existed for any carrier"). format(d.ticket_no.split('-')[0]))
			elif not d.ticket_no:
				frappe.throw(_("Ticket No should not be empty. Please check ticket no at row # {0}"). format(i))
		self.set_status()
				

	def on_cancel(self):
		self.set_status()

	def on_submit(self):
		self.set_status()


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
def get_company_accounts(company):

	company_accounts = frappe.db.sql("""select default_receivable_account, default_payable_account, default_income_account, cost_center
						from `tabCompany` where company_name = %s""", (company), as_dict=True)

	selling_taxes = frappe.get_doc("Sales Taxes and Charges Template", {'company': company, 'is_default': 1}).get('taxes')
	selling_vat_account = selling_taxes[0].get('account_head')
	buying_taxes = frappe.get_doc("Purchase Taxes and Charges Template", {'company': company, 'is_default': 1}).get('taxes')
	buying_vat_account = buying_taxes[0].get('account_head')
	vat_to_be_paid_account = frappe.db.get_value("Account", {'account_number': '44251', 'company': company}, "name")
#	frappe.msgprint("The selling taxes are {0}, the selling vat accountn is {1}, the buying taxes are {2} and the buying vat account is {3} and account for vat to be paid is {4}" .format(selling_taxes, selling_vat_account, buying_taxes, buying_vat_account, vat_to_be_paid_account))
#	frappe.msgprint("The company accounts are: {0}". format(company_accounts))
#	return receivable_acc, payable_acc
	return company_accounts, selling_vat_account, buying_vat_account, vat_to_be_paid_account

@frappe.whitelist()
def get_employee_id(user_id):

#	frappe.msgprint("Session ID {0}". format(user_id))
	employee_id = frappe.db.get_value("Employee", {'user_id': user_id}, "name")
	employee_name = frappe.db.get_value("Employee", {'user_id': user_id}, "employee_name")

#	frappe.msgprint("Employee ID is {0} and Name is {1}". format(employee_id, employee_name))
#	return receivable_acc, payable_acc
	return employee_id, employee_name
