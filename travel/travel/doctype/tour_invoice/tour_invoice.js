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
					group_by: "Group by Voucher (Consolidated)"
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
		if (frm.doc.__islocal == 1) {
			cur_frm.set_value("status", 'Draft');
			frappe.call({
				method: "travel.travel.doctype.tour_invoice.tour_invoice.get_default_values",
				args: {
					company: frm.doc.company,
					date: frm.doc.posting_date
				},
				callback: function(r) {
					if (r.message) {
						cur_frm.set_value("payable_account", r.message[0][0]['default_payable_account']);
						cur_frm.set_value("income_account", r.message[0][0]['default_income_account']);
						cur_frm.set_value("cost_center", r.message[0][0]['cost_center']);
						cur_frm.set_value("def_sales_vat_acc", r.message[1]);
						cur_frm.set_value("def_purchase_vat_acc", r.message[2]);
						cur_frm.set_value("vat_to_be_paid_acc", r.message[3]);
						cur_frm.set_value("company_default_currency", r.message[4]);

						if (r.message[6]) {
							cur_frm.set_value("vat_currency", r.message[6]);
						}
						else {
							cur_frm.set_value("vat_currency", 'LBP');
							frappe.msgprint(__("Please set default currency in Global Defaults to be used for VAT currency"));
						}
						frm.set_currency_labels(["country_customer_vat"], frm.doc.vat_currency)
						cur_frm.set_df_property("vat_currency_exchange_rate", "description",
							("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.vat_currency));
						refresh_field('country_customer_vat');
					}
					else {
						frappe.msgprint(__("There are not a default accounts in the Company {0}, please select the Accounts", 
							[frm.doc.company]));
					}					
				}
			});
		}

		frm.set_query('customer', function(doc) {
			return {
				query: "erpnext.controllers.queries.customer_query"
			};
		});
	},

	customer: function(frm) {
		if (frm.doc.customer) {
			frappe.call({
				method: "travel.travel.doctype.tour_invoice.tour_invoice.get_party_details",
				args: {
					party_type: 'Customer',
					party: frm.doc.customer,
					company: frm.doc.company
				},
				callback: function(r) {
					if (r.message[1]) {
						frm.set_value("customer_currency", r.message[1]);
						frm.set_value("account_currency", r.message[1]);
					}
					else {
						frm.set_value("customer_currency", company_default_currency);
						frm.set_value("account_currency", company_default_currency);
					}
					if (r.message[1] != frm.doc.company_default_currency)
						cur_frm.set_df_property("customer_currency", "read_only", 1);
					else
						cur_frm.set_df_property("customer_currency", "read_only", 0);						
					frm.set_value("receivable_account", r.message[0]);
				}
				
			});
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Customer', party: frm.doc.customer, company: frm.doc.company},
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

	customer_currency: function(frm) {
		if (frm.doc.customer_currency) {
			if (frm.doc.customer_currency == frm.doc.company_default_currency) {
				cur_frm.set_value("customer_exchange_rate", 1);
		                cur_frm.set_df_property("customer_exchange_rate", "description",
		                            ("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.customer_currency));
		                cur_frm.set_df_property("customer_exchange_rate", "read_only", 1);
			}
			else {
				frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, frm.doc.customer_currency, "for_selling", 
					function(exchange_rate) { 
						me.frm.set_value("customer_exchange_rate", exchange_rate);
						cur_frm.set_df_property("customer_exchange_rate", "description",
							("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.customer_currency));
						cur_frm.set_df_property("customer_exchange_rate", "read_only", 0);
					}
				);
			}
			cur_frm.refresh();
//			refresh_field("items");
		}
	},

	tour_end_date: function(frm) {
		if (frm.doc.tour_end_date < frm.doc.tour_start_date)
		{
			frappe.msgprint(__("Tour End Date can not be before Tour Start Date, please select another date"));
			cur_frm.set_value("tour_end_date", "");
		}
	},

	account_currency: function(frm) {
		if (frm.doc.account_currency) {
			if (frm.doc.account_currency == frm.doc.company_default_currency) {
				cur_frm.set_value("cust_acc_exch_rate", 1);
		                cur_frm.set_df_property("cust_acc_exch_rate", "description",
		                            ("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.account_currency));
		                cur_frm.set_df_property("cust_acc_exch_rate", "read_only", 1);
			}
			else {
				frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, frm.doc.customer_currency, "for_selling", 
					function(exchange_rate) { 
						frm.set_value("cust_acc_exch_rate", exchange_rate);
						cur_frm.set_df_property("cust_acc_exch_rate", "description",
							("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.account_currency));
						cur_frm.set_df_property("cust_acc_exch_rate", "read_only", 1);
					}
				);
			}
		}
	},

	customer_exchange_rate: function(frm, cdt, cdn) {
		
		if (frm.doc.items) {
			if (frm.doc.customer_exchange_rate && ((frm.doc.items.length) > 0)) {
//				frappe.msgprint(__("Table length is {0}", [frm.doc.items.length]));
				paid_amount_calculation(frm, cdt, cdn);	
				items_calculation(frm, cdt, cdn);
			}
		}
	},

	discount_amount: function(frm) {
	
		if (frm.doc.cust_total_amount > 0) {
			frm.doc.discount_percent = flt(frm.doc.discount_amount) * 100 / flt(frm.doc.cust_total_amount);
			refresh_field("discount_percent");	
			frm.set_value("base_discount_amount", flt(frm.doc.discount_amount) / frm.doc.customer_exchange_rate);
			frm.set_value("cust_net_total_bv", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
			frm.set_value("base_cust_net_total_bv", (flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount)) / frm.doc.customer_exchange_rate);
			frm.set_value("customer_vat", flt(frm.doc.cust_net_total_bv) * 0.11);
			frm.set_value("base_customer_vat", flt(frm.doc.cust_net_total_bv) * 0.11 / frm.doc.customer_exchange_rate);
			frm.set_value("country_customer_vat", flt(frm.doc.customer_vat) * flt(frm.doc.vat_currency_exchange_rate) / flt(frm.doc.customer_exchange_rate));
			frm.set_currency_labels(["country_customer_vat"], frm.doc.vat_currency)
			frm.set_value("cust_grand_total", flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat));
			frm.set_value("base_cust_grand_total", (flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat)) / frm.doc.customer_exchange_rate);
			frm.set_value("c_s", flt(frm.doc.cust_net_total_bv) - flt(frm.doc.supp_net_total_bv));
			frm.set_value("base_c_s", flt(frm.doc.c_s) / frm.doc.customer_exchange_rate);

			if (frm.doc.customer_currency == frm.doc.account_currency) {
				frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
			}
			else {
				frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) / frm.doc.customer_exchange_rate - flt(frm.doc.paid_amount));
			}
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
		frm.set_value("base_discount_amount", flt(frm.doc.discount_amount) / frm.doc.customer_exchange_rate);
		frm.set_value("cust_net_total_bv", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
		frm.set_value("base_cust_net_total_bv", (flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount)) / frm.doc.customer_exchange_rate);
		frm.set_value("customer_vat", flt(frm.doc.cust_net_total_bv) * 0.11);
		frm.set_value("base_customer_vat", (flt(frm.doc.cust_net_total_bv) * 0.11) / frm.doc.customer_exchange_rate);
		frm.set_value("country_customer_vat", flt(frm.doc.customer_vat) * flt(frm.doc.vat_currency_exchange_rate) / flt(frm.doc.customer_exchange_rate));
		frm.set_currency_labels(["country_customer_vat"], frm.doc.vat_currency)
		frm.set_value("cust_grand_total", flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat));
		frm.set_value("base_cust_grand_total", (flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat)) / frm.doc.customer_exchange_rate);
		frm.set_value("c_s", flt(frm.doc.cust_net_total_bv) - flt(frm.doc.supp_net_total_bv));
		frm.set_value("base_c_s", flt(frm.doc.c_s) / frm.doc.customer_exchange_rate);
		if (frm.doc.customer_currency == frm.doc.account_currency) {
			frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
		}
		else {
			frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) / frm.doc.customer_exchange_rate - flt(frm.doc.paid_amount));
		}
	},

	vat_currency: function(frm) {
		if (frm.doc.vat_currency) {
			if (frm.doc.vat_currency == frm.doc.company_default_currency) {
				cur_frm.set_value("vat_currency_exchange_rate", 1);
		                cur_frm.set_df_property("vat_currency_exchange_rate", "description",
		                            ("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.vat_currency));
		                cur_frm.set_df_property("vat_currency_exchange_rate", "read_only", 1);
			}
			else {
				frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, frm.doc.vat_currency, "for_selling", 
					function(exchange_rate) { 
						me.frm.set_value("vat_currency_exchange_rate", exchange_rate);
						cur_frm.set_df_property("vat_currency_exchange_rate", "description",
							("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.vat_currency));
						cur_frm.set_df_property("vat_currency_exchange_rate", "read_only", 0);
					}
				);
			}
		}
	},

	vat_currency_exchange_rate: function(frm) {
		if (frm.doc.vat_currency_exchange_rate == 0 || !(frm.doc.vat_currency_exchange_rate)) {
			frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, frm.doc.vat_currency, "for_selling", 
				function(exchange_rate) { 
					frm.set_value("vat_currency_exchange_rate", exchange_rate);
					cur_frm.set_df_property("vat_currency_exchange_rate", "description",
						("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.vat_currency));
					cur_frm.set_df_property("vat_currency_exchange_rate", "read_only", 0);
				}
			);
		}
		else {
			frm.set_value("country_customer_vat", flt(frm.doc.customer_vat) * flt(frm.doc.vat_currency_exchange_rate) / flt(frm.doc.customer_exchange_rate));
			frm.set_currency_labels(["country_customer_vat"], frm.doc.vat_currency)	
			cur_frm.set_df_property("vat_currency_exchange_rate", "description",
				("1 " + frm.doc.company_default_currency + " = [?] " + frm.doc.vat_currency));
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
	},

	get_exchange_rate: function(transaction_date, from_currency, to_currency, selling_buying, callback) {
		var args;
		if (!transaction_date || !from_currency || !to_currency) return;
		return frappe.call({
			method: "erpnext.setup.utils.get_exchange_rate",
			args: {
				transaction_date: transaction_date,
				from_currency: from_currency,
				to_currency: to_currency,
				args: selling_buying
			},
			callback: function(r) {
				callback(flt(r.message));
			}
		});
	}
});

frappe.ui.form.on('Tour Invoice Item', {

	items_remove: function(frm, cdt, cdn) {
		items_calculation(frm, cdt, cdn);
	},

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
				method: "travel.travel.doctype.tour_invoice.tour_invoice.get_party_details",
				args: {
					party_type: 'Supplier',
					party: d.supplier,
					company: frm.doc.company
				},
				callback: function(r) {
					if (r.message[1]) {
						frappe.model.set_value(cdt, cdn, "supplier_currency", r.message[1]);
						frappe.model.set_value(cdt, cdn, "supplier_account_currency", r.message[1]);
					}
					else {
						frappe.model.set_value(cdt, cdn, "supplier_currency", "USD");
						frappe.model.set_value(cdt, cdn, "supplier_account_currency", r.message[1]);
					}
					if (r.message[1] != frm.doc.company_default_currency) {
						var df = frappe.meta.get_docfield("Tour Invoice Item","supplier_currency", cur_frm.doc.name);
						df.read_only = 1;
					}
					else {
						var df = frappe.meta.get_docfield("Tour Invoice Item","supplier_currency", cur_frm.doc.name);
						df.read_only = 0;
					}

					if (d.supplier_currency == frm.doc.company_default_currency) {
						frappe.model.set_value(cdt, cdn,"supplier_exchange_rate", 1);
						var df = frappe.meta.get_docfield("Tour Invoice Item","supplier_exchange_rate", cur_frm.doc.name);
						df.description = "1 " + frm.doc.company_default_currency + " = [?] " + d.supplier_currency;
						df.read_only = 1;
						if (flt(d.supp_total_av) > 0) {
							items_calculation(frm, cdt, cdn);
						}
					}
					else {
						frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, d.supplier_currency, "for_buying", 
							function(exchange_rate) { 
								frappe.model.set_value(cdt, cdn, "supplier_exchange_rate", exchange_rate);
								var df = frappe.meta.get_docfield("Tour Invoice Item","supplier_exchange_rate", cur_frm.doc.name);
								df.description = "1 " + frm.doc.company_default_currency + " = [?] " + d.supplier_currency;
								df.read_only = 0;
								if (flt(d.supp_total_av) > 0) {
									items_calculation(frm, cdt, cdn);
								}
							}
						);
					}
					frappe.model.set_value(cdt, cdn, "payable_account", r.message[0]);
					frappe.model.set_value(cdt, cdn, "cost_center", frm.doc.cost_center);
					refresh_field("items");
				}
			});

			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Supplier', party: d.supplier, company: frm.doc.company},
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

	supplier_currency: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		if (d.supplier_currency) {
			if (d.supplier_currency == frm.doc.company_default_currency) {
				frappe.model.set_value(cdt, cdn,"supplier_exchange_rate", 1);
				var df = frappe.meta.get_docfield("Tour Invoice Item","supplier_exchange_rate", cur_frm.doc.name);
				df.description = "1 " + frm.doc.company_default_currency + " = [?] " + d.supplier_currency;
				df.read_only = 1;
				if (flt(d.supp_total_av) > 0) {
					frappe.model.set_value(cdt, cdn, "base_supp_total_bv", flt(d.supp_total_bv) / d.supplier_exchange_rate);
					frappe.model.set_value(cdt, cdn, "base_supp_vat", flt(d.supp_vat) / d.supplier_exchange_rate);
					frappe.model.set_value(cdt, cdn, "base_supp_total_av", flt(d.supp_total_av) / d.supplier_exchange_rate);
					items_calculation(frm, cdt, cdn);
				}
			}
			else {
				frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, d.supplier_currency, "for_buying", 
					function(exchange_rate) { 
						frappe.model.set_value(cdt, cdn, "supplier_exchange_rate", exchange_rate);
						var df = frappe.meta.get_docfield("Tour Invoice Item","supplier_exchange_rate", cur_frm.doc.name);
						df.description = "1 " + frm.doc.company_default_currency + " = [?] " + d.supplier_currency;
						df.read_only = 0;
						if (flt(d.supp_total_av) > 0) {
							frappe.model.set_value(cdt, cdn, "base_supp_total_bv", flt(d.supp_total_bv) / d.supplier_exchange_rate);
							frappe.model.set_value(cdt, cdn, "base_supp_vat", flt(d.supp_vat) / d.supplier_exchange_rate);
							frappe.model.set_value(cdt, cdn, "base_supp_total_av", flt(d.supp_total_av) / d.supplier_exchange_rate);
							items_calculation(frm, cdt, cdn);
						}
					}
				);
			}
			refresh_field("items");
		}	
	},

	supplier_exchange_rate: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		if (d.supplier_exchange_rate == 0 || !(d.supplier_exchange_rate)) {
			frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, d.supplier_currency, "for_buying", 
				function(exchange_rate) { 
					frappe.model.set_value(cdt, cdn, "supplier_exchange_rate", exchange_rate);
				}
			);
			if (flt(d.supp_total_av) > 0) {
				frappe.model.set_value(cdt, cdn, "base_supp_total_bv", flt(d.supp_total_bv) / d.supplier_exchange_rate);
				frappe.model.set_value(cdt, cdn, "base_supp_vat", flt(d.supp_vat) / d.supplier_exchange_rate);
				frappe.model.set_value(cdt, cdn, "base_supp_total_av", flt(d.supp_total_av) / d.supplier_exchange_rate);
				items_calculation(frm, cdt, cdn);
			}
		}
		else if (flt(d.supp_total_av) > 0) {
			frappe.model.set_value(cdt, cdn, "base_supp_total_bv", flt(d.supp_total_bv) / d.supplier_exchange_rate);
			frappe.model.set_value(cdt, cdn, "base_supp_vat", flt(d.supp_vat) / d.supplier_exchange_rate);
			frappe.model.set_value(cdt, cdn, "base_supp_total_av", flt(d.supp_total_av) / d.supplier_exchange_rate);
			items_calculation(frm, cdt, cdn);
		}
	},

	supp_total_bv: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "base_supp_total_bv", flt(d.supp_total_bv) / d.supplier_exchange_rate);
		frappe.model.set_value(cdt, cdn, "supp_vat", flt(d.supp_total_bv) * 0.11);	
		frappe.model.set_value(cdt, cdn, "base_supp_vat", flt(d.supp_vat) / d.supplier_exchange_rate);
		frm.set_currency_labels(["base_supp_total_bv", "base_supp_vat"], frm.doc.company_default_currency, "items");
	},

	supp_vat: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "supp_total_av", flt(d.supp_total_bv) + flt(d.supp_vat));	
		frappe.model.set_value(cdt, cdn, "base_supp_total_av", flt(d.supp_total_av) / d.supplier_exchange_rate);
		frappe.model.set_value(cdt, cdn, "base_supp_vat", flt(d.supp_vat) / d.supplier_exchange_rate);
		frm.set_currency_labels(["base_supp_total_av"], frm.doc.company_default_currency, "items");
		items_calculation(frm, cdt, cdn);
	}
});


frappe.ui.form.on('Travel Payment', {
    
	payments_remove: function(frm, cdt, cdn) {
		paid_amount_calculation(frm, cdt, cdn);
	},

	mode_of_payment: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		get_payment_mode_account(frm, d.mode_of_payment, function(account){
			frappe.model.set_value(cdt, cdn, 'account', account);
			frappe.call({
				method: "travel.travel.doctype.travel_payment.travel_payment.get_account_currency",
				args: {
					account: d.account
				},
				callback: function(r) {
					frappe.model.set_value(cdt, cdn, 'account_currency', r.message);					
					frm.set_currency_labels(["amount"], r.message, "payments");
					refresh_field("payments");
					if (d.account_currency == frm.doc.company_default_currency) {
						frappe.model.set_value(cdt, cdn,"account_exchange_rate", 1);
						var df = frappe.meta.get_docfield("Travel Payment","account_exchange_rate", cur_frm.doc.name);
						df.description = "1 " + frm.doc.company_default_currency + " = [?] " + d.account_currency;
						if (flt(d.amount) > 0) {
							frappe.model.set_value(cdt, cdn, "base_amount", flt(d.amount) / d.account_exchange_rate);
							frm.set_currency_labels(["base_amount"], frm.doc.company_default_currency, "payments");
							paid_amount_calculation(frm, cdt, cdn);	
						}
					}
					else {
						frm.events.get_exchange_rate(frm.doc.posting_date, frm.doc.company_default_currency, d.account_currency, "for_selling", 
							function(exchange_rate) { 
								frappe.model.set_value(cdt, cdn, "account_exchange_rate", exchange_rate);
								var df = frappe.meta.get_docfield("Travel Payment","account_exchange_rate", cur_frm.doc.name);
								df.description = "1 " + frm.doc.company_default_currency + " = [?] " + d.account_currency;
								if (flt(d.amount) > 0) {
									frappe.model.set_value(cdt, cdn, "base_amount", flt(d.amount) / d.account_exchange_rate);
									frm.set_currency_labels(["base_amount"], frm.doc.company_default_currency, "payments");
									paid_amount_calculation(frm, cdt, cdn);	
								}
							});
					}
				}
			});
		});
	},
	amount:  function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "base_amount", flt(d.amount) / d.account_exchange_rate);
		frm.set_currency_labels(["base_amount"], frm.doc.company_default_currency, "payments");
		paid_amount_calculation(frm, cdt, cdn);	
	}
});

var items_calculation = function(frm, cdt, cdn) {
	var total_amount_supp_bv=0,  total_amount_supp_vat=0, total_amount_cust_bv=0,  total_amount_cust_vat=0;

	$.each(frm.doc.items, function(i, row) {
		if (!(row.supp_total_bv)) {
			total_amount_supp_bv = total_amount_supp_bv;
			total_amount_supp_vat = total_amount_supp_vat;
			total_amount_cust_bv = total_amount_cust_bv + flt(row.cust_total_bv);
			total_amount_cust_vat = total_amount_cust_vat + flt(row.cust_vat);
		}
		else {
			total_amount_supp_bv = total_amount_supp_bv + flt(row.supp_total_bv) * flt(frm.doc.customer_exchange_rate) / flt(row.supplier_exchange_rate); 
			total_amount_supp_vat = total_amount_supp_vat + flt(row.supp_vat) * flt(frm.doc.customer_exchange_rate) / flt(row.supplier_exchange_rate);
			total_amount_cust_bv = total_amount_cust_bv + flt(row.cust_total_bv);
			total_amount_cust_vat = total_amount_cust_vat + flt(row.cust_vat);
		}
	});
	frm.set_value("cust_total_amount", total_amount_cust_bv);
	frm.set_value("base_cust_total_amount", flt(frm.doc.cust_total_amount) / frm.doc.customer_exchange_rate);
	frm.set_currency_labels(["base_cust_total_amount"], frm.doc.company_default_currency);
	frm.doc.discount_amount = flt(frm.doc.cust_total_amount) * flt(frm.doc.discount_percent) / 100;
	refresh_field("discount_amount");
	frm.set_value("base_discount_amount", flt(frm.doc.discount_amount) / frm.doc.customer_exchange_rate);
	frm.set_currency_labels(["base_discount_amount"], frm.doc.company_default_currency);
	frm.set_value("cust_net_total_bv", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
	frm.set_value("base_cust_net_total_bv", (flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount)) / frm.doc.customer_exchange_rate);
	frm.set_currency_labels(["base_cust_net_total_bv"], frm.doc.company_default_currency);
	frm.set_value("supp_net_total_bv", total_amount_supp_bv);
	frm.set_value("customer_vat", total_amount_cust_vat);
	frm.set_value("base_customer_vat", total_amount_cust_vat / frm.doc.customer_exchange_rate);
	frm.set_currency_labels(["base_customer_vat"], frm.doc.company_default_currency);
	frm.set_value("country_customer_vat", flt(frm.doc.customer_vat) * flt(frm.doc.vat_currency_exchange_rate) / flt(frm.doc.customer_exchange_rate));
	frm.set_currency_labels(["country_customer_vat"], frm.doc.vat_currency)
	frm.set_value("supplier_vat", total_amount_supp_vat);
	frm.set_value("cust_grand_total", flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat));
	frm.set_value("base_cust_grand_total", (flt(frm.doc.cust_net_total_bv) + flt(frm.doc.customer_vat)) / frm.doc.customer_exchange_rate);
	frm.set_currency_labels(["base_cust_grand_total"], frm.doc.company_default_currency)
	frm.set_value("supp_grand_total",  flt(frm.doc.supp_net_total_bv) + flt(frm.doc.supplier_vat));
	frm.set_value("c_s", flt(frm.doc.cust_net_total_bv) - flt(frm.doc.supp_net_total_bv));
	frm.set_value("base_c_s", flt(frm.doc.c_s) / frm.doc.customer_exchange_rate);
	if (frm.doc.customer_currency == frm.doc.account_currency) {
		frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
	}
	else {
		frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) / frm.doc.customer_exchange_rate - flt(frm.doc.paid_amount));
	}
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
	if (frm.doc.customer_currency == frm.doc.account_currency) {
		$.each(frm.doc.payments, function(i, row) {
			if (row.account_currency == frm.doc.account_currency)
				total_paid_amount = total_paid_amount + flt(row.amount);
			else
				total_paid_amount = total_paid_amount + flt(row.base_amount) * frm.doc.customer_exchange_rate;
		});
	}
	else {
		$.each(frm.doc.payments, function(i, row) {
			total_paid_amount = total_paid_amount + flt(row.base_amount);
		});
	}
	frm.set_value("paid_amount", total_paid_amount);
	if (frm.doc.customer_currency == frm.doc.account_currency) {
		frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
	}
	else {
		frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) / frm.doc.customer_exchange_rate - flt(frm.doc.paid_amount));
	}
}
