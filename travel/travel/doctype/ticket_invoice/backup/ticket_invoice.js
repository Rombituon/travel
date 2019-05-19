// Copyright (c) 2019, Bilal Ghayad and contributors
// For license information, please see license.txt
cur_frm.add_fetch('customer', 'customer_name', 'customer_name')
cur_frm.add_fetch('supplier', 'supplier_name', 'supplier_name')
cur_frm.add_fetch('supplier', 'bsp', 'bsp')
frappe.ui.form.on('Ticket Invoice', {
	refresh: function(frm) {
		if(frm.doc.docstatus===1) {
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.route_options = {
					voucher_no: frm.doc.name,
					from_date: frm.doc.invoice_date,
					to_date: frm.doc.invoice_date,
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
				args: {date: frm.doc.invoice_date, party_type: 'Customer', party: frm.doc.customer},
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
	supplier: function(frm) {
		if (frm.doc.supplier) {
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.invoice_date, party_type: 'Supplier', party: frm.doc.supplier},
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

frappe.ui.form.on('Ticket Invoice Ticket', {
	tax1: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax1) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4) + flt(item.tax5) 
						+ flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax1) == 0) {
			item.tax2 = item.tax3 = item.tax4 = item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax2: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax2) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax2) == 0) {
			item.tax3 = item.tax4 = item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax3: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax3) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax3) == 0) {
			item.tax4 = item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax4: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax4) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax4) == 0) {
			item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax5: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax5) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax5) == 0) {
			item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax6: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax6) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax6) == 0) {
			item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4) + flt(item.tax5);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax7: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax7) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.tax7) == 0) {
			item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4) + flt(item.tax5) + flt(item.tax6);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	tax8: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax8) >= 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			if (flt(item.supp_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else if (flt(item.supp_cut_fare) == 0 && flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	gross_fare: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.gross_fare) > 0) {
			if (flt(item.supp_cut_fare) > 0)
//				item.fare_taxes = flt(item.total_taxes) + flt(item.supp_cut_fare);
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			else
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
//				item.fare_taxes = flt(item.total_taxes) + flt(item.gross_fare);
			refresh_field("ticket");
		}
	},

	supp_cut_fare: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.supp_cut_fare) > 0) {
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.supp_cut_fare));
			refresh_field("ticket");
		}
		else if (flt(item.supp_cut_fare) == 0){
			if (flt(item.cust_cut_fare) == 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			else if (flt(item.cust_cut_fare) > 0)
				frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
			refresh_field("ticket");
		}
	},

	cust_cut_fare: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0) {
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.cust_cut_fare));
		}
		else if ((flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) > 0) || flt(item.cust_cut_fare)==0) {
			frm.events.supp_cut_fare(frm, cdt, cdn);
		}
	},

	supp_iata_insurance: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		item.supp_total_amount = flt(item.fare_taxes) - flt(item.supp_discount_amount) + flt(item.supp_iata_insurance);
		item.uatp_amount = flt(item.cust_total_amount) - flt(item.supp_total_amount);
		refresh_field("ticket");
	},

	cust_iata_insurance: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) == 0 || (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)) {
			item.cust_total_amount = flt(item.fare_taxes) + flt(item.service_charge_amount) + flt(item.cust_iata_insurance) 
						- flt(item.cust_discount_amount);
		}
		else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) > 0) {
			item.cust_total_amount = flt(item.cust_cut_fare) + flt(item.total_taxes) + flt(item.service_charge_amount) 
						+ flt(item.cust_iata_insurance) - flt(item.cust_discount_amount);
		}
		item.uatp_amount = flt(item.cust_total_amount) - flt(item.supp_total_amount);
		refresh_field("ticket");
	},

	service_charge_amount: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) == 0 || (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) == 0)) {
			item.cust_total_amount = flt(item.fare_taxes) + flt(item.service_charge_amount) + flt(item.cust_iata_insurance) 
						- flt(item.cust_discount_amount);
		}
		else if (flt(item.cust_cut_fare) > 0 && flt(item.supp_cut_fare) > 0) {
			item.cust_total_amount = flt(item.cust_cut_fare) + flt(item.total_taxes) + flt(item.service_charge_amount) 
						+ flt(item.cust_iata_insurance) - flt(item.cust_discount_amount);
		}
		item.uatp_amount = flt(item.cust_total_amount) - flt(item.supp_total_amount);
		refresh_field("ticket");
	},

	fare_taxes: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		item.supp_total_amount = flt(item.fare_taxes) + flt(item.supp_iata_insurance) - flt(item.supp_discount_amount);
		if (flt(item.cust_cut_fare) == 0) {
			item.cust_total_amount = flt(item.fare_taxes) + flt(item.service_charge_amount) + flt(item.cust_iata_insurance) 
						- flt(item.cust_discount_amount);
		}
		else if (flt(item.cust_cut_fare) > 0) {
			item.cust_total_amount = flt(item.cust_cut_fare) + flt(item.total_taxes) + flt(item.service_charge_amount) 
						+ flt(item.cust_iata_insurance) - flt(item.cust_discount_amount);
		}
		item.uatp_amount = flt(item.cust_total_amount) - flt(item.supp_total_amount);
		refresh_field("ticket");
	}

/*	fare_basis: function(frm, cdt, cdn) {
	    var item = locals[cdt][cdn];
	    if (flt(item.fare_basis) > 0) {
		frappe.model.set_value(cdt, cdn, "gross_fare", flt(item.fare_basis) + flt(item.ticket_class));
		refresh_field("ticket");
	    }
	},

	ticket_class: function(frm, cdt, cdn) {
	    var item = locals[cdt][cdn];
	    if (flt(item.ticket_class) > 0) {
		frappe.model.set_value(cdt, cdn, "gross_fare", flt(item.fare_basis) + flt(item.ticket_class));
		refresh_field("ticket");
	    }
	}
*/

});
