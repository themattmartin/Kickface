/**
 * Core Constants Module for Omniboard
 */
angular.module("omniboard.core.ob", [])

    // Omniboard wide object
    .factory('ob', [function () {
        return {
            modelNames: {
                auditLog: 'AuditLog',
                alarms: 'Alarms',
                gateway: 'Gateway'
            },
            gatewayTypes: {
                egauge: '-JcfIO2JZwFe4egbBthj',
                mediator: '-JU9n33Ad3gTc_QgROAd'
            }
        };
    }])
;
