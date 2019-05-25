// Copyright (c) 2019, Bilal Ghayad and contributors
// For license information, please see license.txt
cur_frm.add_fetch('customer', 'customer_name', 'customer_name')
cur_frm.add_fetch('supplier', 'supplier_name', 'supplier_name')
cur_frm.add_fetch('supplier', 'bsp', 'bsp')
frappe.ui.form.on('Tour Invoice', {
	refresh: function(frm) {
		if (frm.doc.__islocal == 1) {
			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_employee_id",
				args: {
					user_id: frappe.session.user
				},
				callback: function(r) {
					if (r.message) {
						cur_frm.set_value("created_by", r.message[0]);
						cur_frm.set_value("created_by_employee_name", r.message[1]);
//						refresh_field("created_by");
//						frappe.msgprint(__("Employee ID is {0} and user id is {1}", [r.message, frappe.session.user]));
					}
				}
			});
		}

		if(frm.doc.docstatus===1) {
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.route_options = {
					voucher_no: frm.doc.name,
					from_date: frm.doc.posting_date,
					to_date: frm.doc.posting_date,
					company: frm.doc.company,
					group_by_voucher: false
				};
				frappe.set_route("query-report", "General Ledger");
			}, __("View"));
			frm.add_custom_button(__("Show Payments"), function() {
				frappe.set_route("List", "Payment Entry", {"Payment Entry Reference.reference_name": frm.doc.name});
			}, __("View"));
			frm.add_custom_button(__('Payment'), function() { frm.events.make_payment_entry(frm); }, __("Make"));
			cur_frm.page.set_inner_btn_group_as_primary(__("Make"));
		}
	},
	onload: function(frm) {
/*	    
		if (frm.doc.__islocal == 1) {
			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_employee_id",
				args: {
					user_id: frappe.session.user
				},
				callback: function(r) {
					if (r.message) {
						cur_frm.set_value("created_by", r.message);
						refresh_field("created_by");
//						frappe.msgprint(__("Employee ID is {0} and user id is {1}", [r.message, frappe.session.user]));
					}
				}
			});
		}
*/
		frappe.call({
			method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_company_accounts",
			args: {
				company: frm.doc.company
			},
			callback: function(r) {
				if (r.message) {
					cur_frm.set_value("receivable_account", r.message[0]['default_receivable_account']);
					cur_frm.set_value("payable_account", r.message[0]['default_payable_account']);
					cur_frm.set_value("income_account", r.message[0]['default_income_account']);
					cur_frm.set_value("cost_center", r.message[0]['cost_center']);
				}
				else {
					frappe.msgprint(__("There are not a default accounts in the Company {0}, please select the Accounts", [frm.doc.company]));
				}
			}
		});

		frm.set_query('customer', function(doc) {
			return {
				query: "erpnext.controllers.queries.customer_query"
			};
		});
	},

	customer: function(frm) {
		if (frm.doc.customer) {
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Customer', party: frm.doc.customer},
				callback: function(r) {
					if (flt(r.message) == 0) {
						frm.set_value("customer_balance", "0.00");
					}
					else {
						frm.set_value("customer_balance", r.message);
					}
					refresh_field('customer_balance');
				}
			});
		}
	},

/*	supplier: function(frm) {
		if (frm.doc.supplier) {
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Supplier', party: frm.doc.supplier},
				callback: function(r) {
					if (flt(r.message) == 0) {
						frm.set_value("supplier_balance", "0.00");
					}
					else {
						frm.set_value("supplier_balance", r.message);
					}
					refresh_field('supplier_balance');
				}
			});
		}
	},
*/
	discount_amount: function(frm) {
	
		if (frm.doc.cust_total_amount > 0) {
			frm.doc.discount_percent = flt(frm.doc.discount_amount) * 100 / flt(frm.doc.cust_total_amount);
			refresh_field("discount_percent");	
			frm.set_value("cust_net_total_bv", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
			frm.set_value("cust_grand_total_av", flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat));
			frm.set_value("c_s_av", flt(frm.doc.cust_grand_total_av) - flt(frm.doc.supp_grand_total_av));
			frm.set_value("outstanding_amount", flt(frm.doc.c_s_av) - flt(frm.doc.paid_amount));
		}
		else {
			frm.doc.discount_amount = 0;
			refresh_field("discount_amount");
			frappe.msgprint(__("Customer Total Amount Should be > 0"));
		}
	},

	discount_percent: function(frm) {
	
		frm.doc.discount_amount = flt(frm.doc.discount_percent) * flt(frm.doc.cust_total_amount) / 100;
		refresh_field("discount_amount");	
		frm.set_value("cust_net_total_bv", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
		frm.set_value("cust_grand_total_av", flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat));
		frm.set_value("c_s_av", flt(frm.doc.cust_grand_total_av) - flt(frm.doc.supp_grand_total_av));
		frm.set_value("outstanding_amount", flt(frm.doc.c_s_av) - flt(frm.doc.paid_amount));
	},

        make_payment_entry: function(frm) {
		var method = "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry";
		return frappe.call({
			method: method,
			args: {
				"dt": frm.doc.doctype,
				"dn": frm.doc.name
			},
			callback: function(r) {
				var doclist = frappe.model.sync(r.message);
				frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
			}
		});
	}
});

frappe.ui.form.on('Tour Invoice Item', {
	service_description: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
//		d.tour_id = frm.doc.tour_id;
//		refresh_field("items");
		frappe.model.set_value(cdt, cdn, "tour_id", frm.doc.tour_id);
	},

	cust_unit_price: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "cust_total_bv", flt(d.cust_unit_price) * flt(d.qty));
		frappe.model.set_value(cdt, cdn, "cust_vat", flt(d.cust_unit_price) * flt(d.qty) * 0.11);
	},

	qty: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "cust_total_bv", flt(d.cust_unit_price) * flt(d.qty));
		frappe.model.set_value(cdt, cdn, "cust_vat", flt(d.cust_unit_price) * flt(d.qty) * 0.11);
	},

	cust_vat: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "cust_total_av", flt(d.cust_total_bv) + flt(d.cust_vat));
		items_calculation(frm, cdt, cdn);
	},

	supplier: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		if (d.supplier) {
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Supplier', party: d.supplier},
				callback: function(r) {
					if (flt(r.message) == 0) {
						frappe.model.set_value(cdt, cdn, "supplier_balance", 0);
					}
					else {
						frappe.model.set_value(cdt, cdn, "supplier_balance", r.message);
					}
				}
			});
		}
	},

	supp_total_bv: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "supp_vat", flt(d.supp_total_bv) * 0.11);	
	},

	supp_vat: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "supp_total_av", flt(d.supp_total_bv) + flt(d.supp_vat));	
		items_calculation(frm, cdt, cdn);
	}
});


frappe.ui.form.on('Ticket Invoice Payment', {
	mode_of_payment: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		get_payment_mode_account(frm, d.mode_of_payment, function(account){
			frappe.model.set_value(cdt, cdn, 'account', account)
		})
	},
	amount:  function(frm, cdt, cdn) {
		paid_amount_calculation(frm, cdt, cdn);	
	}
});

var items_calculation = function(frm, cdt, cdn) {
	var total_amount_supp_bv=0,  total_amount_supp_vat=0, total_amount_cust_bv=0,  total_amount_cust_vat=0;

	$.each(frm.doc.items, function(i, row) {
		total_amount_supp_bv = total_amount_supp_bv + flt(row.supp_total_bv);
		total_amount_supp_vat = total_amount_supp_vat + flt(row.supp_vat);
		total_amount_cust_bv = total_amount_cust_bv + flt(row.cust_total_bv);
		total_amount_cust_vat = total_amount_cust_vat + flt(row.cust_vat);
	});
	frm.set_value("cust_total_amount", total_amount_cust_bv);
	frm.doc.discount_amount = flt(frm.doc.cust_total_amount) * flt(frm.doc.discount_percent) / 100;
	refresh_field("discount_amount");
//	frm.set_value("discount_amount", flt(frm.doc.cust_total_amount) * flt(frm.doc.discount_percent) / 100);
	frm.set_value("cust_net_total_bv", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
	frm.set_value("supp_net_total_bv", total_amount_supp_bv);
	frm.set_value("customer_vat", total_amount_cust_vat);
	frm.set_value("supplier_vat", total_amount_supp_vat);
	frm.set_value("cust_grand_total_av", flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat));
	frm.set_value("supp_grand_total_av",  flt(frm.doc.supp_net_total_bv) + flt(frm.doc.supplier_vat));
	frm.set_value("c_s_av", flt(frm.doc.cust_grand_total_av) - flt(frm.doc.supp_grand_total_av));
	frm.set_value("outstanding_amount", flt(frm.doc.c_s_av) - flt(frm.doc.paid_amount));
}

var get_payment_mode_account = function(frm, mode_of_payment, callback) {

	if(!frm.doc.company) {
		frappe.throw(__("Please select the Company first"));
	}

	if(!mode_of_payment) {
		return;
	}

	return  frappe.call({
		method: "erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account",
		args: {
			"mode_of_payment": mode_of_payment,
			"company": frm.doc.company
		},
		callback: function(r, rt) {
			if(r.message) {
				callback(r.message.account)
                        }
		}
	});
}


var paid_amount_calculation = function(frm, cdt, cdn) {
	var total_paid_amount=0;
	$.each(frm.doc.payments, function(i, row) {
		total_paid_amount = total_paid_amount + flt(row.amount);
	});
	frm.set_value("paid_amount", total_paid_amount);
	frm.set_value("outstanding_amount", flt(frm.doc.c_s_av) - flt(frm.doc.paid_amount));
}
