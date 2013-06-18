/*
* Fuel UX FixedGrid
* https://github.com/ExactTarget/fuelux
*
* Copyright (c) 2013 ExactTarget
* Licensed under the MIT license.
*/

define(function (require) {

    var $ = require('jquery');
    var _ = require('underscore');


    // FIXEDGRID CONSTRUCTOR AND PROTOTYPE

    var FixedGrid = function (element, options) {
        this.$element = $(element);
        this.$gridParent = this.$element.parent();
        this.$gridHeader = this.$gridParent.find('div.top-header');
        this.$gridFooter = this.$gridParent.find('div.grid-footer');
        this.$gridTooltip = $('<div class="action-tooltip" id="tooltipContent"></div>');
        this.$header = this.$element.find('div.header');
        this.$content = this.$element.find('div.grid-content');
        this.$footer = this.$element.find('div.footer');
        this.$footerchildren = this.$footer.children().show().css('visibility', 'hidden');
        this.$topheader = this.$element.find('div.header');
        this.$searchcontrol = this.$gridParent.find('.fixedGrid-search');
        this.$filtercontrol = this.$gridParent.find('.filter');
        this.$pagesize = this.$gridParent.find('.grid-pagesize');
        this.$pageinput = this.$gridParent.find('.grid-pager input');
        this.$pagedropdown = this.$gridParent.find('.grid-pager .dropdown-menu');
        this.$prevpagebtn = this.$gridParent.find('.grid-prevpage');
        this.$nextpagebtn = this.$gridParent.find('.grid-nextpage');
        this.$pageslabel = this.$gridParent.find('.grid-pages');
        this.$countlabel = this.$gridParent.find('.grid-count');
        this.$startlabel = this.$gridParent.find('.grid-start');
        this.$endlabel = this.$gridParent.find('.grid-end');

        this.$left = $('<div>', { class: 'grp-left div-left' });
        this.$center = $('<div>', { class: 'grp-center div-center' });
        this.$right = $('<div>', { class: 'grp-right div-right' });
        this.$content.append(this.$left).append(this.$center);
        this.$gridParent.append(this.$gridTooltip);
        this.$centerWrap = $('<div>', { class: 'div-center-wrap' });
        this.$center.append(this.$centerWrap);

        this.$leftHeader = $('<div>', { class: 'grp-left header-left' });
        this.$centerHeader = $('<div>', { class: 'grp-center header-center' });
        this.$rightHeader = $('<div>', { class: 'grp-right header-right' });

        this.options = $.extend(true, {}, $.fn.fixedGrid.defaults, options);

        this.leftColumns = this.options.dataSource.leftColumns ? this.options.dataSource.leftColumns() : [];
        this.columns = this.options.dataSource.columns();
        this.rightColumns = this.options.dataSource.rightColumns ? this.options.dataSource.rightColumns() : [];
        this.hasRightCol = this.rightColumns.length;
        this.hasLeftCol = this.leftColumns.length;
        this.hasContent = true;
        this.availHeight = 0;
        this.totalHeight = 0;
        this.footerHeight = this.$gridFooter.height() || 0;
        this.scrollWidth = this.getScrollBarWidth();

        var self = this;

        this.$content.scroll(function () {
            // Remove extra shim row height if we've scrolled to the top of the grid
            if (self.$content.scrollTop() == 0) {
                self.resizeRowShim();
            }
        });

        this.$header.append(this.$leftHeader).append(this.$centerHeader)

        if (this.hasRightCol) {
            this.$header.append(this.$rightHeader);
            this.$content.append(this.$right);
            this.$element.addClass('has-right-col');
        } else {
            this.setCenterWidth();
        }

        if (this.hasLeftCol) {
            this.$element.addClass('has-left-col');
        }

        if (this.footerHeight) {
            this.$gridParent.addClass("has-footer");
        }

        // Shim until v3 -- account for FuelUX select or native select for page size:
        if (this.$pagesize.hasClass('select')) {
            this.options.dataOptions.pageSize = parseInt(this.$pagesize.select('selectedItem').value, 10);
        } else {
            this.options.dataOptions.pageSize = parseInt(this.$pagesize.val(), 10);
        }

        this.$nextpagebtn.on('click', $.proxy(this.next, this));
        this.$prevpagebtn.on('click', $.proxy(this.previous, this));
        this.$searchcontrol.on('searched cleared', $.proxy(this.searchChanged, this));
        this.$filtercontrol.on('changed', $.proxy(this.filterChanged, this));
        this.$header.on('click', '.header-cell', $.proxy(this.headerClicked, this));

        if (this.$pagesize.hasClass('select')) {
            this.$pagesize.on('changed', $.proxy(this.pagesizeChanged, this));
        } else {
            this.$pagesize.on('change', $.proxy(this.pagesizeChanged, this));
        }

        this.$pageinput.on('change', $.proxy(this.pageChanged, this));

        this.renderData();

        $(window).resize(function () {
            //Prevent resize from firing multiple times in some browsers.
            clearTimeout(this.id);
            this.id = setTimeout(doneResizing, 100);
        });

        function doneResizing() {
            self.setCenterWidth();
            self.setColumnWidths();
            self.syncHeaders();
            self.setGridHeight();
            self.resizeRowShim();
        }
    };

    FixedGrid.prototype = {

        constructor: FixedGrid,

        // TODO: Replace with DIV structure
        renderColumns: function () {
            var self = this;

            this.$left.html('');
            //TODO: See if this placeholder row can be removed.
            this.$centerWrap.html(this.placeholderRowHTML(this.columns.length));
            this.$right.html('');

            this.$center.prepend("<div class=\"placeholder-content\" id=\"loader\">" + this.options.loadingHTML + "</div>");

            var rowStart = '<div class="row">'
                , rowEnd = '</div>'
                , leftColHTML = colHTML = rightColHTML = rowStart;

            $.each(this.leftColumns, function (index, column) {
                leftColHTML += '<div data-property="' + column.property + '"';
                if (column.property == "select") {
                    leftColHTML += ' class="header-cell checkall-cell"><input type="checkbox" class="checkall-toggle" /></div>';
                } else {
                    if (column.sortable && self.options.sortEnabled) {
                        leftColHTML += ' class="sortable header-cell"';
                    } else {
                        leftColHTML += ' class="header-cell"';
                    }
                    leftColHTML += '>' + column.label + '</div>';
                }

            });
            leftColHTML += rowEnd;

            $.each(this.columns, function (index, column) {
                colHTML += '<div data-property="' + column.property + '"';
                if (column.sortable && self.options.sortEnabled) {
                    colHTML += ' class="sortable header-cell"';
                } else {
                    colHTML += ' class="header-cell col"';
                }
                colHTML += '>' + column.label + '</div>';
            });
            colHTML += rowEnd;

            $.each(this.rightColumns, function (index, column) {
                rightColHTML += '<div data-property="' + column.property + '"';
                if (column.sortable && self.options.sortEnabled) {
                    rightColHTML += ' class="sortable header-cell"';
                } else {
                    rightColHTML += ' class="header-cell"';
                }
                rightColHTML += '>' + column.label + '</div>';
            });
            rightColHTML += rowEnd;

            self.$left.html(leftColHTML);
            self.$centerWrap.html(colHTML);
            self.$right.html(rightColHTML);

            this.$content.on('scroll', $.proxy(self.syncVerticalScroll, this));
            self.syncHeaders();
        },

        getScrollBarWidth: function () {
            document.body.style.overflow = 'hidden';
            var width = document.body.clientWidth;
            document.body.style.overflow = 'scroll';
            width -= document.body.clientWidth;
            if (!width) width = document.body.offsetWidth - document.body.clientWidth;
            document.body.style.overflow = '';
            return width;
        },

        setCenterWidth: function () {
            var self = this
                , rightWidth = self.$right.width() || 0;

            //Add a little delay so that browser scrollbars aren't considered when setting widths (Firefox issue)
            clearTimeout(this.id);
            this.id = setTimeout(updateWidths, 100);
            function updateWidths() {
                self.$center.width(self.$element.width() - self.$left.width() - rightWidth - self.scrollWidth);
                self.$center.height(self.$content.height() + self.$leftHeader.height());
            }

        },

        setRightColWidths: function () {
            var self = this
                , rightWidth = self.$right.width()
                , $rightCols = self.$right.find('.header-cell')
                , numRightCols = $rightCols.length
                , colWidth = (rightWidth / numRightCols) - self.scrollWidth - 2;

            self.$right.width(rightWidth - self.scrollWidth - 2);
            self.$rightHeader.width(rightWidth - 3);

            $rightCols.width(colWidth);

        },

        syncHeaders: function () {
            var self = this
                , leftOffset = self.$left.offset()
                , centerOffset = self.$center.offset()
                , rightOffset = self.$right.offset()
                , leftHead = self.$left.find('div.row').first()
                , centerHead = self.$center.find('div.row').first()
                , rightHead = self.$right.find('div.row').first()
                , isSet = leftHead.find('div.header-cell').length
                , hRowStart = '<div class="row">'
                , hRowEnd = '</div>'
            ;


            //grab the first row of our grid data and copy it into our header row:
            this.$leftHeader.height(leftHead.height() + 1).html(hRowStart + leftHead.html() + hRowEnd);
            this.$centerHeader.height(centerHead.height() + 1).html(hRowStart + centerHead.html() + hRowEnd);
            this.$rightHeader.height(rightHead.height() + 1).html(hRowStart + rightHead.html() + hRowEnd);

            //hide the first row and shift it up behind/beneath the header row
            $('div.div-left div.row:first, div.div-center div.row:first, div.div-right div.row:first').css({ visibility: 'hidden' });
            this.$center.scrollTop(-1 * leftHead.height());
            //set the widths of our three header sections to be the same as those in the data grid
            this.$leftHeader.width(self.$left.width());
            this.$centerHeader.css({ left: this.$left.width() }).width(self.$center.width());
            this.$rightHeader.width(self.$right.width() + self.scrollWidth);


            var $lastCol = this.$centerHeader.find('.last-col');
            $lastCol.width(parseFloat($lastCol.css("width")) + 40);
            this.$center.off('scroll').on('scroll', $.proxy(self.syncScroll, this));
        }

        , syncScroll: function (e) {

            //if (this.$center.scrollTop() < 35) { this.$center.scrollTop(35); }
            var hdHeight = this.$leftHeader.height(),
                centerScrollTop = this.$center.scrollTop(),
                contentScrollTop = this.$content.scrollTop();

            this.$centerHeader.css({ left: (-1 * this.$center.scrollLeft() + this.$leftHeader.outerWidth()) });
            this.$left.css({ "margin-top": centerScrollTop - hdHeight });
            this.$right.css({ "margin-top": centerScrollTop - hdHeight });
            this.$center.css({ "margin-top": contentScrollTop - hdHeight });
            this.$centerWrap.css({ "margin-top": -1 * contentScrollTop });
        }

  	, syncVerticalScroll: function (e) {
		    this.$center.css({ "margin-top": this.$content.scrollTop() - this.$leftHeader.height() });
		    this.$centerWrap.css({ "margin-top": -1 * this.$content.scrollTop() });
		}

        // TODO: Replace with DIV structure
        , updateColumns: function ($target, direction) {
            var sortClass = (direction === 'asc') ? 'sort-asc' : 'sort-desc',
                $parent = $target.parent(),
                targetIndex = $parent.find('.header-cell').index($target) + 1,
                targetGrp = $parent.attr('class').split(' ')[0],
                $colGrp = $('.grid-content').find('.' + targetGrp + ' .row .cell:nth-child(' + targetIndex + ')');
            $('.sorted').removeClass('sorted');
            this.$header.find('i').remove();
            $('<i>').addClass('sort-icon ' + sortClass).appendTo($target);
            $target.addClass('sorted');
            $colGrp.addClass('sorted');
        },

        updatePageDropdown: function (data) {
            var pageHTML = '';

            for (var i = 1; i <= data.pages; i++) {
                pageHTML += '<li><a>' + i + '</a></li>';
            }

            this.$pagedropdown.html(pageHTML);
        },

        updatePageButtons: function (data) {
            if (data.page === 1) {
                this.$prevpagebtn.attr('disabled', 'disabled');
            } else {
                this.$prevpagebtn.removeAttr('disabled');
            }

            if (data.page === data.pages) {
                this.$nextpagebtn.attr('disabled', 'disabled');
            } else {
                this.$nextpagebtn.removeAttr('disabled');
            }
        },

        renderData: function () {
            var self = this;

            self.setGridHeight();

            this.columns = this.options.dataSource.columns();
            this.options.dataSource.data(this.options.dataOptions, function (data) {
                if (data.count > 0 && self.options.hasGridPrefs && self.options.dataSource.columnNames) {
                    var i
                        , dat = data.data[0]
                        , colNames = self.options.dataSource.columnNames()
                        , prefs = self.options.gridPrefs
                        , showCols = prefs.show.split('|')
                        , col;
                    for(i in showCols) {
                        col = showCols[i];
                        if(!_.isUndefined(dat[col])) {
                            self.columns.push({
                                property: col
                               , label: colNames[col] || col
                               , sortable: col != 'campaigns'
                            });
                        }
                    }
                }
                self.renderColumns();
                var itemdesc = (data.count === 1) ? self.options.itemText : self.options.itemsText;
                var rowHTML = ''
                    , leftHTML = ''
                    , rightHTML = ''
                    , rowStart = '<div class="row">'
                    , rowEnd = '</div>'
                    , cellStart = '<div class="cell">'
                    , cellEnd = '</div>'
                    , val;

                self.$footerchildren.css('visibility', function () {
                    return (data.count > 0) ? 'visible' : 'hidden';
                });

                self.$pageinput.val(data.page);
                self.$pageslabel.text(data.pages);
                self.$countlabel.text(data.count + ' ' + itemdesc);
                self.$startlabel.text(data.start);
                self.$endlabel.text(data.end);

                self.updatePageDropdown(data);
                self.updatePageButtons(data);

                $.each(data.data, function (index, row) {
                    rowHTML += rowStart;
                    leftHTML += rowStart;
                    rightHTML += rowStart;
                    $.each(self.leftColumns, function (index, column) {
                        leftHTML += cellStart + row[column.property] + cellEnd;
                    });
                    $.each(self.columns, function (index, column) {
                        val = row[column.property];
                        rowHTML += cellStart + ((val === null || typeof (val) == 'undefined') ? self.options.nullText : val) + cellEnd;
                    });
                    $.each(self.rightColumns, function (index, column) {
                        rightHTML += cellStart + row[column.property] + cellEnd;
                    });
                    leftHTML += rowEnd;
                    rowHTML += rowEnd;
                    rightHTML += rowEnd;
                });

                if (!rowHTML) {
                    rowStart = '<div class="row placeholder-row">';
                    rowHTML += rowStart;
                    leftHTML += rowStart;
                    rightHTML += rowStart;
                    cellStart = '<div class="cell" style="width:125px">';
                    $.each(self.leftColumns, function (index, column) {
                        leftHTML += '<div class="cell" style="width:17px">' + cellEnd;
                    });
                    $.each(self.columns, function (index, column) {
                        rowHTML += cellStart + cellEnd;
                    });
                    $.each(self.rightColumns, function (index, column) {
                        rightHTML += cellStart + cellEnd;
                    });
                    leftHTML += rowEnd;
                    rowHTML += rowEnd;
                    rightHTML += rowEnd;
                    self.hasContent = false;
                    self.$center.prepend('<div class="no-results">' + '0 ' + self.options.itemsText + '</div>');
                } else {
                    self.hasContent = true;
                    self.$center.find('div.no-results').hide();
                }

                self.$left.append(leftHTML);
                self.$centerWrap.append(rowHTML);
                self.$right.append(rightHTML);

                self.setCenterWidth();
                self.setColumnWidths();

                if (self.options.setRowHeights) {
                    self.setRowHeights();
                }
                self.syncHeaders();
                self.$element.trigger('loaded');
                $("#loader").remove();
                $('.dropdown-toggle').dropdown();
                $('.extra-actions').hover(function () {
                    $('.dropdown-menu').hide();
                    $(this).find('.dropdown-menu').first().stop(true, true).show();
                }, function () {
                    $(this).find('.dropdown-menu').first().stop(true, true).delay(300).hide(0);
                }); ;

                $('.grid-icon').hover(
                    function () {
                        var content = $(this).attr('data-content');
                        self.$gridTooltip.html(content).show();
                        self.$gridTooltip.position({ at: 'top center', of: $(this), my: 'top-35' });
                    },
                    function () {
                        self.$gridTooltip.hide();
                    }
                 );
                if (self.options.success) { self.options.success(data); }
            });

        },
        //TODO: See if this placeholder row function can be removed or modified to work with the !rowHTML case above.
        placeholderRowHTML: function (count) {
            var row = "<div class=\"placeholder-row last-row\">";
            for (var i = 0; i < count; i++) {
                row += "<div class=\"cell\" style=\"text-align:center;padding:20px;border-bottom:none;\"></div>"
            }
            row += "</div>"

            return row;
        },

        headerClicked: function (e) {
            var $target = $(e.target);
            if (!$target.hasClass('sortable')) return;

            var direction = this.options.dataOptions.sortDirection;
            var sort = this.options.dataOptions.sortProperty;
            var property = $target.data('property');

            if (sort === property) {
                this.options.dataOptions.sortDirection = (direction === 'asc') ? 'desc' : 'asc';
            } else {
                this.options.dataOptions.sortDirection = 'asc';
                this.options.dataOptions.sortProperty = property;
            }

            this.options.dataOptions.pageIndex = 1;
            this.updateColumns($target, this.options.dataOptions.sortDirection);
            this.renderData();
        },

        pagesizeChanged: function (e, pageSize) {
            if (pageSize) {
                this.options.dataOptions.pageSize = parseInt(pageSize.value, 10);
            } else {
                this.options.dataOptions.pageSize = parseInt($(e.target).val(), 10);
            }

            this.options.dataOptions.pageIndex = 1;
            this.renderData();
        },

        pageChanged: function (e) {
            var pageRequested = parseInt($(e.target).val(), 10);
            pageRequested = (isNaN(pageRequested)) ? 1 : pageRequested;
            var maxPages = this.$pageslabel.text();

            this.options.dataOptions.pageIndex =
                (pageRequested > maxPages) ? maxPages : pageRequested;

            this.renderData();
        },

        searchChanged: function (e, search) {
            this.options.dataOptions.search = search;
            this.options.dataOptions.pageIndex = 1;
            this.renderData();
        },

        filterChanged: function (e, filter) {
            this.options.dataOptions.filter = filter;
            this.renderData();
        },

        previous: function () {
            this.options.dataOptions.pageIndex--;
            this.renderData();
        },

        next: function () {
            this.options.dataOptions.pageIndex++;
            this.renderData();
        },

        reload: function () {
            this.options.dataOptions.pageIndex = 1;
            this.renderData();
        },

        setColumnWidths: function () {
            var totalColWidth = 0,
                $headerCells = this.$element.find('div.header-cell'),
                len = $headerCells.length,
                self = this,
                availWidth = self.$center.width();

            $headerCells.each(function (i, el) {
                var $header = $(el),
                    colWidth = 0,
                    headerWidth = $header.width(),
                    scrollFix = self.hasRightCol ? self.scrollWidth + 2 : 0;

                $header.removeAttr('style');
                if (i == len - 1) {
                    // if we're to the last column and there's more than 125px width available, set the width to fill it
                    colWidth = availWidth - totalColWidth - scrollFix > 125 ? availWidth - totalColWidth - scrollFix : 125;
                    $header.addClass('last-col');
                }
                else {
                    if ($header.hasClass('checkall-cell')) { // check if it's a checkbox column
                        colWidth = 17;
                    } else if ($header.hasClass('width-set')) { // if the column has previously been sized, just use that width value.
                        colWidth = headerWidth;
                    } else { // otherwise resize column to its default width + 15 (room for sort arrow), or a min-width of 125
                        colWidth = headerWidth > 110 ? headerWidth + 15 : 125;
                    }
                    // One last check for super wide cells
                    colWidth = colWidth > 350 ? 350 : colWidth;

                    $header.addClass('width-set');
                }
                totalColWidth += colWidth + 20;
                $header.attr("style", "width:" + colWidth + "px; min-width:" + colWidth + "px");
            });
        }

        , setRowHeights: function () {
            var leftRows = this.$left.find('div.row')
                , totalRows = leftRows.length
                , visibleRows = totalRows
                , rows = this.$center.find('div.row')
                , rightRows = this.$right.find('div.row')
                , height = 0
                , maxHeight = 0
                , $centerWrap = this.$center.find('.div-center-wrap')
                , leftRow, row, rightRow;

            this.totalHeight = 0;
            if (visibleRows < this.options.dataOptions.pageSize) visibleRows = this.options.dataOptions.pageSize;

            for (var i = 0; i <= visibleRows; i++) {

                leftRow = leftRows.eq(i);
                row = rows.eq(i);
                rightRow = rightRows.eq(i);
                maxHeight = leftRow.height();
                height = row.height();

                if (height > maxHeight) { maxHeight = height; }

                height = rightRow.height();

                if (height > maxHeight) { maxHeight = height; }

                leftRow.height(maxHeight);
                row.height(maxHeight);
                rightRow.height(maxHeight);
                this.totalHeight += maxHeight; //total height used by resizeRowShim to calculate shim row height

                if ((i == visibleRows - 1 || i == totalRows - 1) && this.hasContent) {
                    leftRow.addClass('last-row');
                    row.addClass('last-row');
                    rightRow.addClass('last-row');
                } else if (i == visibleRows) {
                    //Add a shim row of empy cells that we can later scale to fill any extra vertical space in the grid

                    if (this.hasContent) {
                        $centerWrap.append($centerWrap.find('.last-row').clone().removeAttr('style').removeClass('last-row').addClass('shim-row'));
                        this.$left.append(this.$left.find('.last-row').clone().removeAttr('style').removeClass('last-row').addClass('shim-row'));
                        this.$right.append(this.$right.find('.last-row').clone().removeAttr('style').removeClass('last-row').addClass('shim-row'));
                    }
                    $('.shim-row .cell').not('.shim-row.placeholder-content .cell').html('');
                    this.resizeRowShim();
                    return;
                }
            }
        }

        , setGridHeight: function () {
            var headerRowHeight = this.$header.outerHeight()
            , gridHeight = this.$gridParent.height() - this.$gridHeader.outerHeight() - headerRowHeight - this.footerHeight - 1;

            this.$center.height(gridHeight + headerRowHeight - 1);
            this.$element.height(gridHeight + headerRowHeight);
            this.$content.height(gridHeight);
        }

        , resizeRowShim: function () {
            var $shimRow = $('.shim-row');

            this.availHeight = this.$center.height();
            //Check if there's more available vertical space than the combined height of our grid rows
            if (this.availHeight > this.totalHeight) {
                $shimRow.height(this.availHeight - this.totalHeight + this.$content.scrollTop());
            } else {
                $shimRow.removeAttr("style");
            }

        }
    };


    // FIXEDGRID PLUGIN DEFINITION

    $.fn.fixedGrid = function (option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('fixedGrid');
            var options = typeof option === 'object' && option;

            if (!data) $this.data('fixedGrid', (data = new FixedGrid(this, options)));
            if (typeof option === 'string') data[option]();
        });
    };

    $.fn.fixedGrid.defaults = {
        dataOptions: { pageIndex: 1, pageSize: 25 },
        loadingHTML: '<div class="progress progress-striped active" style="width:50%;margin:auto;"><div class="bar" style="width:100%;"></div></div>',
        itemsText: 'items',
        itemText: 'item',
        setRowHeights: true,
        replaceNulls: true,
        nullText: '',
        hasGridPrefs: false,
        gridPrefs: null,
        sortEnabled: true
    };

    $.fn.fixedGrid.Constructor = FixedGrid;

});
