import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  Link,
  OutlinedInput,
  Paper,
  Tab,
  Tabs,
  Typography,
  Zoom,
  SvgIcon,
  makeStyles,
  Select,
  MenuItem,
} from "@material-ui/core";
import InfoTooltip from "../../components/InfoTooltip/InfoTooltip.jsx";
import { ReactComponent as InfoIcon } from "../../assets/icons/info-fill.svg";
import { getOgvTokenImage, getTokenImage, trim, formatCurrency } from "../../helpers";
import { changeApproval, changeWrap } from "../../slices/WrapThunk";
import {
  changeMigrationApproval,
  bridgeBack,
  migrateWithType,
  migrateCrossChainWSOGV,
} from "../../slices/MigrateThunk";
import { switchNetwork } from "../../slices/NetworkSlice";
import { useWeb3Context } from "src/hooks/web3Context";
import { isPendingTxn, txnButtonText, txnButtonTextMultiType } from "src/slices/PendingTxnsSlice";
import { Skeleton } from "@material-ui/lab";
import { error } from "../../slices/MessagesSlice";
import { NETWORKS } from "../../constants";
import { ethers } from "ethers";
import "../Stake/stake.scss";

const useStyles = makeStyles(theme => ({
  textHighlight: {
    color: theme.palette.highlight,
  },
}));

function Wrap() {
  const dispatch = useDispatch();
  const { provider, address, connect } = useWeb3Context();
  const networkId = useSelector(state => state.network.networkId);
  const networkName = useSelector(state => state.network.networkName);

  const [zoomed, setZoomed] = useState(false);
  const [assetFrom, setAssetFrom] = useState("sOGV");
  const [assetTo, setAssetTo] = useState("gOGV");
  const [quantity, setQuantity] = useState("");

  const chooseCurrentAction = () => {
    if (assetFrom === "sOGV") return "Wrap from";
    if (assetTo === "sOGV") return "Unwrap from";
    return "Transform";
  };
  const currentAction = chooseCurrentAction();

  const classes = useStyles();

  const isAppLoading = useSelector(state => state.app.loading);
  const isAccountLoading = useSelector(state => state.account.loading);
  const currentIndex = useSelector(state => {
    return state.app.currentIndex;
  });

  const sOgvPrice = useSelector(state => {
    return state.app.marketPrice;
  });

  const wsOgvPrice = useSelector(state => {
    return state.app.marketPrice * state.app.currentIndex;
  });

  const sogvBalance = useSelector(state => {
    return state.account.balances && state.account.balances.sogv;
  });
  const wsogvBalance = useSelector(state => {
    return state.account.balances && state.account.balances.wsogv;
  });
  const gogvBalance = useSelector(state => {
    return state.account.balances && state.account.balances.gogv;
  });

  const unwrapAllowance = useSelector(state => {
    return state.account.wrapping && state.account.wrapping.ogvUnwrap;
  });

  const migrateSogvAllowance = useSelector(state => {
    return state.account.migration && state.account.migration.sogv;
  });

  const migrateWsogvAllowance = useSelector(state => {
    return state.account.migration && state.account.migration.wsogv;
  });

  const unwrapGogvAllowance = useSelector(state => {
    return state.account.wrapping && state.account.wrapping.gOgvUnwrap;
  });

  const pendingTransactions = useSelector(state => {
    return state.pendingTransactions;
  });

  const avax = NETWORKS[43114];
  const ethereum = NETWORKS[1];

  const isAvax = useMemo(() => networkId != 1 && networkId != 4, [networkId]);
  useEffect(() => {
    if (isAvax) {
      setAssetFrom("wsOGV");
      setAssetTo("gOGV");
    }
  }, [isAvax]);

  const wrapButtonText =
    assetTo === "gOGV" ? (assetFrom === "wsOGV" ? "Migrate" : "Wrap") + " to gOGV" : `${currentAction} ${assetFrom}`;

  const setMax = () => {
    if (assetFrom === "sOGV") setQuantity(sogvBalance);
    if (assetFrom === "wsOGV") setQuantity(wsogvBalance);
    if (assetFrom === "gOGV") setQuantity(gogvBalance);
  };

  const handleSwitchChain = id => {
    return () => {
      dispatch(switchNetwork({ provider: provider, networkId: id }));
    };
  };

  const onSeekApproval = async token => {
    await dispatch(changeApproval({ address, token: token.toLowerCase(), provider, networkID: networkId }));
  };

  const unWrapWSOGV = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(quantity) || Number(quantity) === 0 || quantity === "") {
      // eslint-disable-next-line no-alert
      return dispatch(error("Please enter a value!"));
    }
    if (ethers.utils.parseUnits(quantity, "ether").gt(ethers.utils.parseUnits(wsogvBalance, "ether"))) {
      return dispatch(error("You cannot unwrap more than your wsOGV balance."));
    }

    await dispatch(
      changeWrap({ address, action: "unwrap", value: quantity.toString(), provider, networkID: networkId }),
    );
  };

  const hasCorrectAllowance = useCallback(() => {
    if (assetFrom === "sOGV" && assetTo === "gOGV") return migrateSogvAllowance > sogvBalance;
    if (assetFrom === "wsOGV" && assetTo === "gOGV") return migrateWsogvAllowance > wsogvBalance;
    if (assetFrom === "wsOGV" && assetTo === "sOGV") return unwrapAllowance > wsogvBalance;
    if (assetFrom === "gOGV") return unwrapGogvAllowance > gogvBalance;

    return 0;
  }, [unwrapAllowance, migrateSogvAllowance, migrateWsogvAllowance, assetTo, assetFrom]);

  const isAllowanceDataLoading = unwrapAllowance == null && currentAction === "Unwrap";
  // const convertedQuantity = 0;
  const convertedQuantity = useMemo(() => {
    if (assetFrom === "sOGV") {
      return quantity / currentIndex;
    } else if (assetTo === "sOGV") {
      return quantity * currentIndex;
    } else {
      return quantity;
    }
  }, [quantity]);
  // currentAction === "Unwrap" ? (quantity * wsOgvPrice) / sOgvPrice : (quantity * sOgvPrice) / wsOgvPrice;

  let modalButton = [];

  modalButton.push(
    <Button variant="contained" color="primary" className="connect-button" onClick={connect} key={1}>
      Connect Wallet
    </Button>,
  );

  const changeAssetFrom = event => {
    setQuantity("");
    setAssetFrom(event.target.value);
  };

  const changeAssetTo = event => {
    setQuantity("");
    setAssetTo(event.target.value);
  };

  const approveMigrate = token => {
    dispatch(
      changeMigrationApproval({
        token: token.toLowerCase(),
        provider,
        address,
        networkID: networkId,
        displayName: token,
      }),
    );
  };

  const migrateToGogv = type => {
    if (isAvax) {
      dispatch(
        migrateCrossChainWSOGV({
          provider,
          address,
          networkID: networkId,
          value: quantity,
        }),
      );
    } else {
      dispatch(
        migrateWithType({
          provider,
          address,
          networkID: networkId,
          type,
          value: quantity,
          action: "Successfully wrapped to gOGV!",
        }),
      );
    }
  };

  const unwrapGogv = () => {
    dispatch(bridgeBack({ provider, address, networkID: networkId, value: quantity }));
  };

  const approveCorrectToken = () => {
    if (assetFrom === "sOGV" && assetTo === "gOGV") approveMigrate("sOGV");
    if (assetFrom === "wsOGV" && assetTo === "gOGV") approveMigrate("wsOGV");
    if (assetFrom === "wsOGV" && assetTo === "sOGV") onSeekApproval("wsOGV");
    if (assetFrom === "gOGV" && assetTo === "sOGV") approveMigrate("gOGV");
  };

  const chooseCorrectWrappingFunction = () => {
    if (assetFrom === "sOGV" && assetTo === "gOGV") migrateToGogv("sogv");
    if (assetFrom === "wsOGV" && assetTo === "gOGV") migrateToGogv("wsogv");
    if (assetFrom === "gOGV" && assetTo === "sOGV") unwrapGogv();
    if (assetFrom === "wsOGV" && assetTo === "sOGV") unWrapWSOGV();
  };

  const chooseInputArea = () => {
    if (!address || isAllowanceDataLoading) return <Skeleton width="150px" />;
    if (assetFrom === assetTo) return "";
    if (assetTo === "wsOGV")
      return (
        <div className="no-input-visible">
          Wrapping to <b>wsOGV</b> is disabled at this time due to the upcoming{" "}
          <a className="v2-migration-link" href="https://olygivedao.medium.com/introducing-olygive-v2-c4ade14e9fe">
            V2 migration
          </a>
          .
          <br />
          If you'd like to wrap your <b>sOGV</b>, please try wrapping to <b>gOGV</b> instead.
        </div>
      );
    if (!hasCorrectAllowance() && assetTo === "gOGV")
      return (
        <div className="no-input-visible">
          First time wrapping to <b>gOGV</b>?
          <br />
          Please approve Olygive to use your <b>{assetFrom}</b> for this transaction.
        </div>
      );
    if (!hasCorrectAllowance() && assetTo === "sOGV")
      return (
        <div className="no-input-visible">
          First time unwrapping <b>{assetFrom}</b>?
          <br />
          Please approve Olygive to use your <b>{assetFrom}</b> for unwrapping.
        </div>
      );

    return (
      <FormControl className="ogv-input" variant="outlined" color="primary">
        <InputLabel htmlFor="amount-input"></InputLabel>
        <OutlinedInput
          id="amount-input"
          type="number"
          placeholder="Enter an amount"
          className="stake-input"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          labelWidth={0}
          endAdornment={
            <InputAdornment position="end">
              <Button variant="text" onClick={setMax} color="inherit">
                Max
              </Button>
            </InputAdornment>
          }
        />
      </FormControl>
    );
  };

  const chooseButtonArea = () => {
    if (!address) return "";
    if (assetTo === "wsOGV") return "";
    if (assetFrom === assetTo) return "";
    if (!hasCorrectAllowance())
      return (
        <Button
          className="stake-button wrap-page"
          variant="contained"
          color="primary"
          disabled={
            isPendingTxn(pendingTransactions, "approve_wrapping") ||
            isPendingTxn(pendingTransactions, "approve_migration")
          }
          onClick={approveCorrectToken}
        >
          {txnButtonTextMultiType(pendingTransactions, ["approve_wrapping", "approve_migration"], "Approve")}
        </Button>
      );

    if (hasCorrectAllowance())
      return (
        <Button
          className="stake-button wrap-page"
          variant="contained"
          color="primary"
          disabled={isPendingTxn(pendingTransactions, "wrapping") || isPendingTxn(pendingTransactions, "migrate")}
          onClick={chooseCorrectWrappingFunction}
        >
          {txnButtonTextMultiType(pendingTransactions, ["wrapping", "migrate"], wrapButtonText)}
        </Button>
      );
  };

  return (
    <div id="stake-view" className="wrapper">
      <Zoom in={true} onEntered={() => setZoomed(true)}>
        <Paper className={`ogv-card`}>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <div className="card-header">
                <Typography variant="h5">Wrap / Unwrap</Typography>
                <Link
                  className="migrate-sogv-button"
                  style={{ textDecoration: "none" }}
                  href={
                    assetTo === "wsOGV"
                      ? "https://docs.olygivedao.finance/main/contracts/tokens#wsogv"
                      : "https://docs.olygivedao.finance/main/contracts/tokens#gogv"
                  }
                  aria-label="wsogv-wut"
                  target="_blank"
                >
                  <Typography>{assetTo}</Typography> <SvgIcon component={InfoIcon} color="primary" />
                </Link>
              </div>
            </Grid>

            <Grid item>
              <div className="stake-top-metrics">
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="wrap-sOGV">
                      <Typography variant="h5" color="textSecondary">
                        sOGV Price
                      </Typography>
                      <Typography variant="h4">
                        {sOgvPrice ? formatCurrency(sOgvPrice, 2) : <Skeleton width="150px" />}
                      </Typography>
                    </div>
                  </Grid>
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="wrap-index">
                      <Typography variant="h5" color="textSecondary">
                        Current Index
                      </Typography>
                      <Typography variant="h4">
                        {currentIndex ? <>{trim(currentIndex, 1)} OGV</> : <Skeleton width="150px" />}
                      </Typography>
                    </div>
                  </Grid>
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="wrap-wsOGV">
                      <Typography variant="h5" color="textSecondary">
                        {`${assetTo} Price`}
                        <InfoTooltip
                          message={`${assetTo} = sOGV * index\n\nThe price of ${assetTo} is equal to the price of OGV multiplied by the current index`}
                        />
                      </Typography>
                      <Typography variant="h4">
                        {wsOgvPrice ? formatCurrency(wsOgvPrice, 2) : <Skeleton width="150px" />}
                      </Typography>
                    </div>
                  </Grid>
                </Grid>
              </div>
            </Grid>

            <div className="staking-area">
              {!address ? (
                <div className="stake-wallet-notification">
                  <div className="wallet-menu" id="wallet-menu">
                    {modalButton}
                  </div>
                  <Typography variant="h6">Connect your wallet</Typography>
                </div>
              ) : (
                <>
                  <Box className="stake-action-area">
                    <Box style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      {isAvax ? (
                        <Box height="32px">
                          <Typography>
                            Transform <b>wsOGV</b> to <b>gOGV</b>
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          <Typography>
                            <span className="asset-select-label">{currentAction}</span>
                          </Typography>
                          <FormControl
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              margin: "0 10px",
                              height: "33px",
                              minWidth: "69px",
                            }}
                          >
                            <Select
                              id="asset-select"
                              value={assetFrom}
                              label="Asset"
                              onChange={changeAssetFrom}
                              disableUnderline
                            >
                              <MenuItem value={"sOGV"}>sOGV</MenuItem>
                              <MenuItem value={"wsOGV"}> wsOGV</MenuItem>
                              <MenuItem value={"gOGV"}>gOGV</MenuItem>
                            </Select>
                          </FormControl>

                          <Typography>
                            <span className="asset-select-label"> to </span>
                          </Typography>
                          <FormControl
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              margin: "0 10px",
                              height: "33px",
                              minWidth: "69px",
                            }}
                          >
                            <Select
                              id="asset-select"
                              value={assetTo}
                              label="Asset"
                              onChange={changeAssetTo}
                              disableUnderline
                            >
                              <MenuItem value={"gOGV"}>gOGV</MenuItem>
                              <MenuItem value={"sOGV"}>sOGV</MenuItem>
                            </Select>
                          </FormControl>
                        </>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" style={{ paddingBottom: 0 }}>
                      <div className="stake-tab-panel wrap-page">
                        {chooseInputArea()}
                        {/* <Box width="1px" /> */}
                        {chooseButtonArea()}
                      </div>
                    </Box>
                    {/* {quantity && (
                      <Box padding={1}>
                        <Typography variant="body2" className={classes.textHighlight}>
                          {`${trim(quantity, 4)} ${assetFrom} will result in ${trim(convertedQuantity, 4)} ${assetTo}`}
                        </Typography>
                      </Box>
                    )} */}
                  </Box>
                  <div className={`stake-user-data`}>
                    {!isAvax ? (
                      <>
                        <div className="data-row">
                          <Typography variant="body1">sOGV Balance</Typography>
                          <Typography variant="body1">
                            {isAppLoading ? <Skeleton width="80px" /> : <>{trim(sogvBalance, 4)} sOGV</>}
                          </Typography>
                        </div>
                        <div className="data-row">
                          <Typography variant="body1">wsOGV Balance</Typography>
                          <Typography variant="body1">
                            {isAppLoading ? <Skeleton width="80px" /> : <>{trim(wsogvBalance, 4)} wsOGV</>}
                          </Typography>
                        </div>
                        <div className="data-row">
                          <Typography variant="body1">gOGV Balance</Typography>
                          <Typography variant="body1">
                            {isAppLoading ? <Skeleton width="80px" /> : <>{trim(gogvBalance, 4)} gOGV</>}
                          </Typography>
                        </div>

                        <Divider />
                        <Box width="100%" align="center" p={1}>
                          <Typography variant="body1" style={{ margin: "15px 0 10px 0" }}>
                            Got wsOGV on Avalanche? Click below to switch networks and migrate to gOGV (no bridge
                            required!)
                          </Typography>
                          <Button onClick={handleSwitchChain(43114)} variant="outlined" p={1}>
                            <img height="28px" width="28px" src={avax.image} alt={avax.imageAltText} />
                            <Typography variant="h6" style={{ marginLeft: "8px" }}>
                              {avax.chainName}
                            </Typography>
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <>
                        <div className="data-row">
                          <Typography variant="body1">wsOGV Balance ({networkName})</Typography>
                          <Typography variant="body1">
                            {isAppLoading ? <Skeleton width="80px" /> : <>{trim(wsogvBalance, 4)} wsOGV</>}
                          </Typography>
                        </div>
                        <div className="data-row">
                          <Typography variant="body1">gOGV Balance ({networkName})</Typography>
                          <Typography variant="body1">
                            {isAppLoading ? <Skeleton width="80px" /> : <>{trim(gogvBalance, 4) + " gOGV"}</>}
                          </Typography>
                        </div>
                        <Divider />
                        <Box width="100%" align="center" p={1}>
                          <Typography variant="h6" style={{ margin: "15px 0 10px 0" }}>
                            Back to Ethereum Mainnet
                          </Typography>
                          <Button onClick={handleSwitchChain(1)} variant="outlined" p={1}>
                            <img height="28px" width="28px" src={ethereum.image} alt={ethereum.imageAltText} />
                            <Typography variant="h6" style={{ marginLeft: "8px" }}>
                              {ethereum.chainName}
                            </Typography>
                          </Button>
                        </Box>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </Grid>
        </Paper>
      </Zoom>
    </div>
  );
}

export default Wrap;
