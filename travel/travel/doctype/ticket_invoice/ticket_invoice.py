# -*- coding: utf-8 -*-
# Copyright (c) 2019, Bilal Ghayad and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from erpnext.accounts.general_ledger import make_gl_entries
from erpnext.accounts.general_ledger import delete_gl_entries
from erpnext.controllers.accounts_controller import AccountsController
from frappe import utils

#class TicketInvoice(Document):
class TicketInvoice(AccountsController):
#	pass
	def on_cancel(self):
		delete_gl_entries(voucher_type=self.doctype, voucher_no=self.name)

	def on_submit(self):
		if (self.cust_grand_total_amount != 0):
			self.make_gl_entries()

	def make_gl_entries(self):
		customer_against = self.supplier + " + " + self.income_account
		customer_gl_entries =  self.get_gl_dict({
			"account": self.receivable_account,
			"against": customer_against,
			"party_type": "Customer",
			"party": self.customer,
			"debit": self.cust_grand_total_amount,
			"debit_in_account_currency": self.cust_grand_total_amount,
			"against_voucher": self.name,
			"against_voucher_type": self.doctype,
			"cost_center": self.cost_center
		})

		supplier_against = self.customer + " - " + self.income_account
		supplier_gl_entry = self.get_gl_dict({
			"account": self.payable_account,
			"against": supplier_against,
			"party_type": "Supplier",
			"party": self.supplier,
			"credit": self.supp_total_amount,
			"credit_in_account_currency": self.supp_total_amount,
			"against_voucher": self.name,
			"against_voucher_type": self.doctype,
			"cost_center": self.cost_center
		})

		income_against = self.customer + " - " + self.supplier 

		income_gl_entry = self.get_gl_dict({
			"account": self.income_account,
			"against": income_against,
			"credit": self.uatp_grand_total_amount,
			"credit_in_account_currency": self.uatp_grand_total_amount,
			"against_voucher": self.name,
			"against_voucher_type": self.doctype,
			"cost_center": self.cost_center
		})

		make_gl_entries([customer_gl_entries, supplier_gl_entry, income_gl_entry], cancel=(self.docstatus == 2),
				update_outstanding="No", merge_entries=False)



@frappe.whitelist()
def get_company_accounts(company):

	company_accounts = frappe.db.sql("""select default_receivable_account, default_payable_account, default_income_account, cost_center
						from `tabCompany` where company_name = %s""", (company), as_dict=True)

#	frappe.msgprint("The company accounts are: {0}". format(company_accounts))
#	return receivable_acc, payable_acc
	return company_accounts

@frappe.whitelist()
def get_employee_id(user_id):

#	frappe.msgprint("Session ID {0}". format(user_id))
	employee_id = frappe.db.get_value("Employee", {'user_id': user_id}, "name")
	employee_name = frappe.db.get_value("Employee", {'user_id': user_id}, "employee_name")

#	frappe.msgprint("Employee ID is {0} and Name is {1}". format(employee_id, employee_name))
#	return receivable_acc, payable_acc
	return employee_id, employee_name
