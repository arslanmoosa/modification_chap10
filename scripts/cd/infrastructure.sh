#
# Deploy infrastructure
#
# Usage:
#
#   ./scripts/cd/infrastructure.sh
#

az login
az aks get-credentials --resource-group deakinuni --name modify --overwrite-existing