import { useCallback, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
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
  Divider,
} from "@material-ui/core";
import { t, Trans } from "@lingui/macro";
import NewReleases from "@material-ui/icons/NewReleases";
import RebaseTimer from "../../components/RebaseTimer/RebaseTimer";
import TabPanel from "../../components/TabPanel";
import { getOgvTokenImage, getTokenImage, trim } from "../../helpers";
import { changeApproval, changeStake } from "../../slices/StakeThunk";
import "./stake.scss";
import { useWeb3Context } from "src/hooks/web3Context";
import { isPendingTxn, txnButtonText } from "src/slices/PendingTxnsSlice";
import { Skeleton } from "@material-ui/lab";
import ExternalStakePool from "./ExternalStakePool";
import { error } from "../../slices/MessagesSlice";
import { ethers } from "ethers";
import ZapCta from "../Zap/ZapCta";
import { useAppSelector } from "src/hooks";
import StakeRow from "./StakeRow";

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const sOgvImg = getTokenImage("sogv");
const ogvImg = getOgvTokenImage(16, 16);

function Stake() {
  const dispatch = useDispatch();
  const { provider, address, connect } = useWeb3Context();
  const networkId = useAppSelector(state => state.network.networkId);

  const [zoomed, setZoomed] = useState(false);
  const [view, setView] = useState(0);
  const [quantity, setQuantity] = useState(0);

  const tokens = useAppSelector(state => state.zap.balances);
  const isAppLoading = useAppSelector(state => state.app.loading);
  const currentIndex = useAppSelector(state => {
    return state.app.currentIndex;
  });
  const fiveDayRate = useAppSelector(state => {
    return state.app.fiveDayRate;
  });
  const ogvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.ogv;
  });
  const oldSogvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.oldsogv;
  });
  const sogvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.sogv;
  });
  const fsogvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.fsogv;
  });
  const wsogvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.wsogv;
  });
  const fiatDaowsogvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.fiatDaowsogv;
  });
  const fiatDaoAsSogv = Number(fiatDaowsogvBalance) * Number(currentIndex);
  const gOgvBalance = useAppSelector(state => {
    return state.account.balances && state.account.balances.gogv;
  });
  const gOgvAsSogv = Number(gOgvBalance) * Number(currentIndex);
  const wsogvAsSogv = useAppSelector(state => {
    return state.account.balances && state.account.balances.wsogvAsSogv;
  });
  const stakeAllowance = useAppSelector(state => {
    return (state.account.staking && state.account.staking.ogvStake) || 0;
  });
  const unstakeAllowance = useAppSelector(state => {
    return (state.account.staking && state.account.staking.ogvUnstake) || 0;
  });
  const stakingRebase = useAppSelector(state => {
    return state.app.stakingRebase || 0;
  });
  const stakingAPY = useAppSelector(state => {
    return state.app.stakingAPY || 0;
  });
  const stakingTVL = useAppSelector(state => {
    return state.app.stakingTVL;
  });

  const pendingTransactions = useAppSelector(state => {
    return state.pendingTransactions;
  });

  const inputTokenImages = useMemo(
    () =>
      Object.entries(tokens)
        .filter(token => token[0] !== "sogv")
        .map(token => token[1].img)
        .slice(0, 3),
    [tokens],
  );

  const setMax = () => {
    if (view === 0) {
      setQuantity(Number(ogvBalance));
    } else {
      setQuantity(Number(sogvBalance));
    }
  };

  const onSeekApproval = async (token: string) => {
    await dispatch(changeApproval({ address, token, provider, networkID: networkId }));
  };

  const onChangeStake = async (action: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(quantity) || quantity === 0) {
      // eslint-disable-next-line no-alert
      return dispatch(error(t`Please enter a value!`));
    }

    // 1st catch if quantity > balance
    let gweiValue = ethers.utils.parseUnits(quantity.toString(), "gwei");
    if (action === "stake" && gweiValue.gt(ethers.utils.parseUnits(ogvBalance, "gwei"))) {
      return dispatch(error(t`You cannot stake more than your OGV balance.`));
    }

    if (action === "unstake" && gweiValue.gt(ethers.utils.parseUnits(sogvBalance, "gwei"))) {
      return dispatch(error(t`You cannot unstake more than your sOGV balance.`));
    }

    await dispatch(changeStake({ address, action, value: quantity.toString(), provider, networkID: networkId }));
  };

  const hasAllowance = useCallback(
    token => {
      if (token === "ogv") return stakeAllowance > 0;
      if (token === "sogv") return unstakeAllowance > 0;
      return 0;
    },
    [stakeAllowance, unstakeAllowance],
  );

  const isAllowanceDataLoading = (stakeAllowance == null && view === 0) || (unstakeAllowance == null && view === 1);

  let modalButton = [];

  modalButton.push(
    <Button variant="contained" color="primary" className="connect-button" onClick={connect} key={1}>
      <Trans>Connect Wallet</Trans>
    </Button>,
  );

  const changeView = (_event: React.ChangeEvent<{}>, newView: number) => {
    setView(newView);
  };

  const trimmedBalance = Number(
    [sogvBalance, fsogvBalance, wsogvAsSogv, gOgvAsSogv, fiatDaoAsSogv]
      .filter(Boolean)
      .map(balance => Number(balance))
      .reduce((a, b) => a + b, 0)
      .toFixed(4),
  );
  const trimmedStakingAPY = trim(stakingAPY * 100, 1);

  const stakingRebasePercentage = trim(stakingRebase * 100, 4);
  const nextRewardValue = trim((Number(stakingRebasePercentage) / 100) * trimmedBalance, 4);

  return (
    <div id="stake-view">
      <Zoom in={true} onEntered={() => setZoomed(true)}>
        <Paper className={`ogv-card`}>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <div className="card-header">
                <Typography variant="h5">Single Stake (3, 3)</Typography>
                <RebaseTimer />

                {address && Number(oldSogvBalance) > 0.01 && (
                  <Link
                    className="migrate-sogv-button"
                    style={{ textDecoration: "none" }}
                    href="https://docs.olygivedao.finance/using-the-website/migrate"
                    aria-label="migrate-sogv"
                    target="_blank"
                  >
                    <NewReleases viewBox="0 0 24 24" />
                    <Typography>
                      <Trans>Migrate sOGV!</Trans>
                    </Typography>
                  </Link>
                )}
              </div>
            </Grid>

            <Grid item>
              <div className="stake-top-metrics">
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="stake-apy">
                      <Typography variant="h5" color="textSecondary">
                        <Trans>APY</Trans>
                      </Typography>
                      <Typography variant="h4">
                        {stakingAPY ? (
                          <span data-testid="apy-value">
                            {new Intl.NumberFormat("en-US").format(Number(trimmedStakingAPY))}%
                          </span>
                        ) : (
                          <Skeleton width="150px" data-testid="apy-loading" />
                        )}
                      </Typography>
                    </div>
                  </Grid>

                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="stake-tvl">
                      <Typography variant="h5" color="textSecondary">
                        <Trans>Total Value Deposited</Trans>
                      </Typography>
                      <Typography variant="h4">
                        {stakingTVL ? (
                          <span data-testid="tvl-value">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                              minimumFractionDigits: 0,
                            }).format(stakingTVL)}
                          </span>
                        ) : (
                          <Skeleton width="150px" data-testid="tvl-loading" />
                        )}
                      </Typography>
                    </div>
                  </Grid>

                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="stake-index">
                      <Typography variant="h5" color="textSecondary">
                        <Trans>Current Index</Trans>
                      </Typography>
                      <Typography variant="h4">
                        {currentIndex ? (
                          <span data-testid="index-value">{trim(Number(currentIndex), 1)} OGV</span>
                        ) : (
                          <Skeleton width="150px" data-testid="index-loading" />
                        )}
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
                  <Typography variant="h6">
                    <Trans>Connect your wallet to stake OGV</Trans>
                  </Typography>
                </div>
              ) : (
                <>
                  <Box className="stake-action-area">
                    <Tabs
                      key={String(zoomed)}
                      centered
                      value={view}
                      textColor="primary"
                      indicatorColor="primary"
                      className="stake-tab-buttons"
                      onChange={changeView}
                      aria-label="stake tabs"
                      //hides the tab underline sliding animation in while <Zoom> is loading
                      TabIndicatorProps={!zoomed ? { style: { display: "none" } } : undefined}
                    >
                      <Tab
                        label={t({
                          id: "do_stake",
                          comment: "The action of staking (verb)",
                        })}
                        {...a11yProps(0)}
                      />
                      <Tab label={t`Unstake`} {...a11yProps(1)} />
                    </Tabs>
                    <Grid container className="stake-action-row">
                      <Grid item xs={12} sm={8} className="stake-grid-item">
                        {address && !isAllowanceDataLoading ? (
                          (!hasAllowance("ogv") && view === 0) || (!hasAllowance("sogv") && view === 1) ? (
                            <Box className="help-text">
                              <Typography variant="body1" className="stake-note" color="textSecondary">
                                {view === 0 ? (
                                  <>
                                    <Trans>First time staking</Trans> <b>OGV</b>?
                                    <br />
                                    <Trans>Please approve Olygive Dao to use your</Trans> <b>OGV</b>{" "}
                                    <Trans>for staking</Trans>.
                                  </>
                                ) : (
                                  <>
                                    <Trans>First time unstaking</Trans> <b>sOGV</b>?
                                    <br />
                                    <Trans>Please approve Olygive Dao to use your</Trans> <b>sOGV</b>{" "}
                                    <Trans>for unstaking</Trans>.
                                  </>
                                )}
                              </Typography>
                            </Box>
                          ) : (
                            <FormControl className="ogv-input" variant="outlined" color="primary">
                              <InputLabel htmlFor="amount-input"></InputLabel>
                              <OutlinedInput
                                id="amount-input"
                                type="number"
                                placeholder="Enter an amount"
                                className="stake-input"
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
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
                          )
                        ) : (
                          <Skeleton width="150px" />
                        )}
                      </Grid>
                      <Grid item xs={12} sm={4} className="stake-grid-item">
                        <TabPanel value={view} index={0} className="stake-tab-panel">
                          <Box m={-2}>
                            {isAllowanceDataLoading ? (
                              <Skeleton />
                            ) : address && hasAllowance("ogv") ? (
                              <Button
                                className="stake-button"
                                variant="contained"
                                color="primary"
                                disabled={isPendingTxn(pendingTransactions, "staking")}
                                onClick={() => {
                                  onChangeStake("stake");
                                }}
                              >
                                {txnButtonText(pendingTransactions, "staking", t`Stake OGV`)}
                              </Button>
                            ) : (
                              <Button
                                className="stake-button"
                                variant="contained"
                                color="primary"
                                disabled={isPendingTxn(pendingTransactions, "approve_staking")}
                                onClick={() => {
                                  onSeekApproval("ogv");
                                }}
                              >
                                {txnButtonText(pendingTransactions, "approve_staking", t`Approve`)}
                              </Button>
                            )}
                          </Box>
                        </TabPanel>

                        <TabPanel value={view} index={1} className="stake-tab-panel">
                          <Box m={-2}>
                            {isAllowanceDataLoading ? (
                              <Skeleton />
                            ) : address && hasAllowance("sogv") ? (
                              <Button
                                className="stake-button"
                                variant="contained"
                                color="primary"
                                disabled={isPendingTxn(pendingTransactions, "unstaking")}
                                onClick={() => {
                                  onChangeStake("unstake");
                                }}
                              >
                                {txnButtonText(pendingTransactions, "unstaking", t`Unstake OGV`)}
                              </Button>
                            ) : (
                              <Button
                                className="stake-button"
                                variant="contained"
                                color="primary"
                                disabled={isPendingTxn(pendingTransactions, "approve_unstaking")}
                                onClick={() => {
                                  onSeekApproval("sogv");
                                }}
                              >
                                {txnButtonText(pendingTransactions, "approve_unstaking", t`Approve`)}
                              </Button>
                            )}
                          </Box>
                        </TabPanel>
                      </Grid>
                    </Grid>
                  </Box>

                  <div className="stake-user-data">
                    <StakeRow
                      title={t`Unstaked Balance`}
                      id="user-balance"
                      balance={`${trim(Number(ogvBalance), 4)} OGV`}
                      {...{ isAppLoading }}
                    />
                    <StakeRow
                      title={t`Staked Balance`}
                      id="user-staked-balance"
                      balance={`${trimmedBalance} sOGV`}
                      {...{ isAppLoading }}
                    />
                    <StakeRow
                      title={t`Single Staking`}
                      balance={`${trim(Number(sogvBalance), 4)} sOGV`}
                      indented
                      {...{ isAppLoading }}
                    />
                    <StakeRow
                      title={t`Staked Balance in Fuse`}
                      balance={`${trim(Number(fsogvBalance), 4)} fsOGV`}
                      indented
                      {...{ isAppLoading }}
                    />
                    <StakeRow
                      title={t`Wrapped Balance`}
                      balance={`${trim(Number(wsogvBalance), 4)} wsOGV`}
                      {...{ isAppLoading }}
                      indented
                    />
                    <StakeRow
                      title={t`Wrapped Balance in FiatDAO`}
                      balance={`${trim(Number(fiatDaowsogvBalance), 4)} wsOGV`}
                      {...{ isAppLoading }}
                      indented
                    />
                    <StakeRow
                      title={`${t`Wrapped Balance`} (v2)`}
                      balance={`${trim(Number(gOgvBalance), 4)} gOGV`}
                      indented
                      {...{ isAppLoading }}
                    />
                    <Divider color="secondary" />
                    <StakeRow title={t`Next Reward Amount`} balance={`${nextRewardValue} sOGV`} {...{ isAppLoading }} />
                    <StakeRow
                      title={t`Next Reward Yield`}
                      balance={`${stakingRebasePercentage}%`}
                      {...{ isAppLoading }}
                    />
                    <StakeRow
                      title={t`ROI (5-Day Rate)`}
                      balance={`${trim(Number(fiveDayRate) * 100, 4)}%`}
                      {...{ isAppLoading }}
                    />
                  </div>
                </>
              )}
            </div>
          </Grid>
        </Paper>
      </Zoom>
      <ZapCta />
      <ExternalStakePool />
    </div>
  );
}

export default Stake;
